from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
source = root / "UKD_Grow_Masterplan_2026_iPhone_Mobile_Edition.pdf"
output = root / "tmp" / "pdfs"
output.mkdir(parents=True, exist_ok=True)

document = fitz.open(source)
print({"pages": document.page_count, "metadata": document.metadata})
for page_number in (0, 2, min(10, document.page_count - 1), document.page_count - 1):
    page = document.load_page(page_number)
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
    pixmap.save(output / f"mobile-page-{page_number + 1}.png")
