"""
Global constants used across the application.
"""

ARXIV_API_URL = "https://export.arxiv.org/api/query"
""" 
The endpoint for querying the ArXiv API.
"""

ARXIV_XML_NAMESPACE = {
    'atom': 'http://www.w3.org/2005/Atom',
    'arxiv': 'http://arxiv.org/schemas/atom'
}
""" 
XML Namespaces required for parsing the Atom feed returned by ArXiv.
- `'atom'`: The standard Atom syndication format.
- `'arxiv'`: ArXiv-specific extensions.
"""

ARXIV_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edge/121.0.0.0"
]
""" 
A list of common User-Agent strings to use when making requests to the ArXiv API, 
helping to mimic typical browser behavior and avoid potential blocking.
"""