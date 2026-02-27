# python-sidecar/src/api/v1/endpoints/github.py
from fastapi import APIRouter, HTTPException
from typing import List

from src.dto.github import GithubAnalyzeRequest, GithubRepoResponse
from src.api.deps import GithubServiceDep

router = APIRouter()

# ================= 1. NHÓM API ĐỘC LẬP (STANDALONE) =================

@router.post("/analyze", response_model=GithubRepoResponse)
async def analyze_github_repo(req: GithubAnalyzeRequest, service: GithubServiceDep):
    """
    Phân tích một Github Repo. 
    (Hỗ trợ luôn cho Contextual bằng việc truyền paper_id trong payload)
    """
    try:
        return await service.analyze_repo(req)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repos", response_model=List[GithubRepoResponse])
async def get_all_repos(service: GithubServiceDep):
    """Lấy danh sách tất cả các Github Repo đã lưu."""
    return await service.get_all_repos()

@router.get("/repo/{owner}/{repo_name}", response_model=GithubRepoResponse)
async def get_single_repo(owner: str, repo_name: str, service: GithubServiceDep):
    """Lấy chi tiết 1 Repo độc lập."""
    repo_id = f"{owner}/{repo_name}"
    repo = await service.get_single_repo(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.delete("/repo/{owner}/{repo_name}")
async def delete_single_repo(owner: str, repo_name: str, service: GithubServiceDep):
    """Xóa vĩnh viễn Repo và các liên kết của nó."""
    repo_id = f"{owner}/{repo_name}"
    success = service.delete_single_repo(repo_id)
    if success:
        return {"status": "deleted", "repo_id": repo_id}
    raise HTTPException(status_code=404, detail="Repository not found")


# ================= 2. NHÓM API THEO NGỮ CẢNH (CONTEXTUAL) =================

@router.get("/paper/{paper_id}", response_model=List[GithubRepoResponse])
async def get_paper_repos(paper_id: str, service: GithubServiceDep):
    """Lấy danh sách các Repo liên kết với một Bài báo."""
    try:
        return await service.get_repos_for_paper(paper_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/paper/{paper_id}/repo/{owner}/{repo_name}")
async def unlink_paper_repo(paper_id: str, owner: str, repo_name: str, service: GithubServiceDep):
    """Hủy liên kết giữa Bài báo và Repo (Không xóa Repo khỏi DB)."""
    repo_id = f"{owner}/{repo_name}"
    success = service.unlink_repo(paper_id, repo_id)
    if success:
        return {"status": "unlinked", "paper_id": paper_id, "repo_id": repo_id}
    raise HTTPException(status_code=404, detail="Link not found")