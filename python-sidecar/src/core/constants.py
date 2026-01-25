"""
Global constants used across the application.
"""

ARXIV_API_URL = "http://export.arxiv.org/api/query"
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