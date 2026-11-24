import os
import subprocess
import markdown

md_path = r"d:\Shuttle proj\PROJECT_REVIEW_DOCUMENT.md"
html_path = r"d:\Shuttle proj\PROJECT_REVIEW_DOCUMENT.html"
pdf_path = r"d:\Shuttle proj\CampusMove_AI_Project_Review.pdf"

with open(md_path, "r", encoding="utf-8") as f:
    md_content = f.read()

# Convert markdown to HTML with tables, fenced code blocks
html_body = markdown.markdown(md_content, extensions=["tables", "fenced_code"])

template = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CampusMove AI — Project Review & Technical Specification</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.55;
    font-size: 10pt;
    padding: 0;
    margin: 0;
  }
  h1 {
    font-size: 18pt;
    color: #0f172a;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 8px;
  }
  h2 {
    font-size: 13pt;
    color: #1e40af;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 20px;
    margin-bottom: 8px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11pt;
    color: #0f172a;
    margin-top: 14px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  p {
    margin: 0 0 8px 0;
  }
  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 3px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 16px 0;
    font-size: 8.5pt;
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  thead {
    display: table-header-group;
  }
  th {
    background-color: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 7px 9px;
    border: 1px solid #cbd5e1;
  }
  td {
    padding: 6px 9px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tbody tr:nth-child(even) {
    background-color: #f8fafc;
  }
  blockquote {
    margin: 6px 0 12px 0;
    padding: 7px 12px;
    background-color: #eff6ff;
    border-left: 3.5px solid #3b82f6;
    color: #1e3a8a;
    font-style: normal;
    border-radius: 0 5px 5px 0;
    page-break-inside: avoid;
  }
  code {
    font-family: Consolas, 'Courier New', monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    padding: 1.5px 4px;
    border-radius: 3px;
    color: #0f172a;
  }
  pre {
    background: #0f172a;
    color: #f8fafc;
    padding: 10px 12px;
    border-radius: 5px;
    overflow-x: auto;
    font-size: 8pt;
    line-height: 1.4;
    margin: 8px 0 12px 0;
    page-break-inside: avoid;
  }
  pre code {
    background: transparent;
    color: inherit;
    padding: 0;
  }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 16px 0;
  }
  strong {
    color: #0f172a;
  }
</style>
</head>
<body>
""" + html_body + """
</body>
</html>"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(template)

edge_exe = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cmd = [
    edge_exe,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--run-all-compositor-stages-before-draw",
    f"--print-to-pdf={pdf_path}",
    html_path
]

print("Executing Microsoft Edge headless PDF compilation...")
res = subprocess.run(cmd, capture_output=True, text=True)

if os.path.exists(pdf_path):
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"SUCCESS: Generated PDF at {pdf_path} ({size_kb:.1f} KB)")
else:
    print("PDF generation failed:", res.stderr)
