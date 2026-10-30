import os
import subprocess
import sys

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
NOTES_DIR = r"C:\Nandhu\Learning\projects\enterprise-inventory-warehouse-management-ERP\notes"

def render_html_to_pdf(html_path, pdf_path):
    print(f"Rendering {html_path} -> {pdf_path}...")
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        html_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"✅ Created {pdf_path} ({size_kb:.1f} KB)")
    else:
        print(f"❌ Failed to create {pdf_path}: {res.stderr}")

if __name__ == "__main__":
    print("PDF Generator Ready")
