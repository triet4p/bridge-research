# python-sidecar/src/services/github.py
import httpx
import json
from typing import Dict, Any, List
from urllib.parse import urlparse
import dspy

from src.core.logger import get_logger
from src.repositories.github import GithubRepository
from src.models.github import GithubRepo
from src.dto.github import GithubAnalyzeRequest, GithubRepoResponse
from src.services.lm_setting import get_lm_for_task
from src.models.lm_setting import LMTask

_logger = get_logger("[PythonSidecar - GithubService]")

class GithubAnalyzerSignature(dspy.Signature):
    """
    ROLE: Expert AI Software Architect.
    TASK: Analyze a Github repository's codebase metadata to evaluate its reusability, complexity, and tech stack.

    INSTRUCTIONS:
    1. Extract core technologies used from 'readme_content' and 'dependencies_content'.
    2. Assess 'reproduction_complexity' (Easy/Medium/Hard) and 'reusability_score' (High/Medium/Low) based on the 'repo_tree_structure'.
    3. Identify hardware requirements if explicitly mentioned.
    4. Write a concise 'executive_summary' in Markdown focusing on installation, usage, and key takeaways. DO NOT use general filler text.
    """
    
    repo_metadata: str = dspy.InputField(desc="Basic information about the repository (stars, description).")
    repo_tree_structure: str = dspy.InputField(desc="The directory and file structure of the repository.")
    readme_content: str = dspy.InputField(desc="The content of the README.md file.")
    dependencies_content: str = dspy.InputField(desc="The content of dependency files like requirements.txt or package.json.")
    
    tech_stack: List[str] = dspy.OutputField(desc="List of 3-7 core technologies/frameworks used.")
    reproduction_complexity: str = dspy.OutputField(desc="Difficulty to setup (Easy, Medium, Hard). Give 1 short sentence reason.")
    reusability_score: str = dspy.OutputField(desc="Code reusability (High, Medium, Low) based on structure.")
    hardware_requirements: str = dspy.OutputField(desc="Required hardware (e.g., '1x A100 GPU', 'Consumer GPU', 'Not specified').")
    executive_summary: str = dspy.OutputField(desc="Markdown summary of what the repo does and how to run it.")


class GithubService:
    def __init__(self, github_repo: GithubRepository):
        self.github_repo = github_repo
        self.analyzer = dspy.ChainOfThought(GithubAnalyzerSignature)
        self.http_timeout = 15.0

    def _parse_github_url(self, url: str) -> str | None:
        """Trích xuất 'owner/repo' từ URL."""
        try:
            parsed = urlparse(url)
            path_parts =[p for p in parsed.path.split('/') if p]
            if len(path_parts) >= 2:
                # Bỏ qua các đường dẫn con nếu user paste nhầm link file, chỉ lấy root repo
                return f"{path_parts[0]}/{path_parts[1]}"
        except Exception:
            pass
        return None

    async def fetch_repo_metadata(self, repo_id: str) -> Dict[str, Any]:
        """Lấy thông tin cơ bản của repo từ Github API."""
        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            resp = await client.get(f"https://api.github.com/repos/{repo_id}")
            if resp.status_code != 200:
                raise ValueError(f"Github API error: {resp.status_code} - Repo might be private or not exist.")
            return resp.json()

    async def fetch_repo_tree(self, repo_id: str, default_branch: str) -> str:
        """Lấy cấu trúc thư mục của repo để đánh giá kiến trúc."""
        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            resp = await client.get(f"https://api.github.com/repos/{repo_id}/git/trees/{default_branch}?recursive=1")
            if resp.status_code != 200:
                return "Tree structure unavailable."
            tree_data = resp.json().get('tree',[])
            
            # Chỉ lấy các file/thư mục ở tầng nông hoặc quan trọng để tránh quá tải
            paths = [item['path'] for item in tree_data if item['type'] in ('blob', 'tree')]
            # Giới hạn số lượng hiển thị cho AI để tránh tràn context
            if len(paths) > 200:
                paths = paths[:200] + ["... (truncated)"]
            return "\n".join(paths)

    async def fetch_raw_file(self, repo_id: str, branch: str, file_path: str) -> str:
        """Lấy nội dung raw của một file, bỏ qua Rate Limit API."""
        url = f"https://raw.githubusercontent.com/{repo_id}/{branch}/{file_path}"
        async with httpx.AsyncClient(timeout=self.http_timeout, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.text
            return ""

    async def analyze_repo(self, req: GithubAnalyzeRequest) -> GithubRepoResponse:
        """Thực thi toàn bộ luồng: Fetch -> Phân tích AI -> Lưu DB."""
        repo_id = self._parse_github_url(req.url)
        if not repo_id:
            raise ValueError("Invalid Github URL. Example: https://github.com/owner/repo")

        # 1. Kiểm tra Cache trong Database trước
        existing_repo = self.github_repo.get_repo(repo_id)
        if existing_repo:
            _logger.info(f"Loaded {repo_id} from Database cache.")
            if req.paper_id:
                self.github_repo.link_paper(req.paper_id, repo_id)
            return self._to_response(existing_repo)

        # 2. Fetch Data từ Github
        _logger.info(f"📡 Fetching Github data for {repo_id}...")
        meta = await self.fetch_repo_metadata(repo_id)
        default_branch = meta.get('default_branch', 'main')
        stars = meta.get('stargazers_count', 0)
        desc = meta.get('description', '')

        tree_str = await self.fetch_repo_tree(repo_id, default_branch)
        
        # Fetch README (thử cả in hoa và in thường)
        readme_content = await self.fetch_raw_file(repo_id, default_branch, "README.md")
        if not readme_content:
            readme_content = await self.fetch_raw_file(repo_id, default_branch, "readme.md")
            
        # Cắt bớt README để tránh tràn ngữ cảnh (Max ~25,000 ký tự)
        readme_content = readme_content[:25000]

        # Fetch Dependencies
        dep_files =["requirements.txt", "environment.yml", "pyproject.toml", "setup.py", "package.json"]
        dep_content = ""
        for df in dep_files:
            content = await self.fetch_raw_file(repo_id, default_branch, df)
            if content:
                dep_content += f"\n--- {df} ---\n{content[:5000]}"
                break # Chỉ cần 1 file dependency phổ biến nhất là đủ để nhận diện tech stack

        # 3. Kích hoạt AI Code Analyzer
        lm = await get_lm_for_task(LMTask.CODE)
        if not lm:
            raise ValueError("AI Provider is not configured for CODE task.")

        _logger.info(f"🧠 Analyzing repo {repo_id} with AI Agent ({lm.model})...")
        meta_str = f"Stars: {stars}\nDescription: {desc}"
        
        try:
            with dspy.context(lm=lm):
                pred = self.analyzer(
                    repo_metadata=meta_str,
                    repo_tree_structure=tree_str,
                    readme_content=readme_content,
                    dependencies_content=dep_content
                )
        except Exception as e:
            _logger.error(f"❌ AI Analysis failed: {e}")
            raise ValueError(f"AI Analysis failed: {str(e)}")

        # 4. Lưu kết quả vào Database
        repo = GithubRepo(
            repo_id=repo_id,
            url=f"https://github.com/{repo_id}",
            description=desc,
            stars=stars,
            default_branch=default_branch,
            tech_stack_json=json.dumps(pred.tech_stack),
            complexity=pred.reproduction_complexity,
            reusability=pred.reusability_score,
            hardware_req=pred.hardware_requirements,
            summary_markdown=pred.executive_summary,
        )
        saved_repo = self.github_repo.save_repo(repo)

        # 5. Liên kết với bài báo (nếu có context)
        if req.paper_id:
            self.github_repo.link_paper(req.paper_id, repo_id)

        _logger.info(f"✅ Successfully analyzed and saved {repo_id}.")
        return self._to_response(saved_repo)

    def _to_response(self, repo: GithubRepo) -> GithubRepoResponse:
        return GithubRepoResponse(
            repo_id=repo.repo_id,
            url=repo.url,
            description=repo.description,
            stars=repo.stars,
            default_branch=repo.default_branch,
            tech_stack=repo.tech_stack,
            complexity=repo.complexity,
            reusability=repo.reusability,
            hardware_req=repo.hardware_req,
            summary_markdown=repo.summary_markdown,
            analyzed_at=repo.analyzed_at
        )
    
    def unlink_repo(self, paper_id: str, repo_id: str) -> bool:
        """Hủy liên kết repo khỏi bài báo."""
        return self.github_repo.unlink_paper(paper_id, repo_id)
    
    async def get_all_repos(self) -> List[GithubRepoResponse]:
        """Lấy tất cả Repo trong hệ thống."""
        repos = self.github_repo.get_all_repos()
        return[self._to_response(r) for r in repos]

    async def get_single_repo(self, repo_id: str) -> GithubRepoResponse | None:
        """Lấy thông tin 1 Repo đơn lẻ."""
        repo = self.github_repo.get_repo(repo_id)
        if repo:
            return self._to_response(repo)
        return None

    def delete_single_repo(self, repo_id: str) -> bool:
        """Xóa vĩnh viễn 1 Repo khỏi DB."""
        return self.github_repo.delete_repo(repo_id)

    async def get_repos_for_paper(self, paper_id: str) -> List[GithubRepoResponse]:
        repos = self.github_repo.get_repos_by_paper(paper_id)
        return[self._to_response(r) for r in repos]
    