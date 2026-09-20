import sys
from playwright.sync_api import sync_playwright

def scrape(url):
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-gpu", 
                    "--disable-software-rasterizer", 
                    "--disable-dev-shm-usage", 
                    "--no-sandbox"
                ]
            )
            page = browser.new_page()
            page.route("**/*", lambda route: route.continue_())
            page.goto(url, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            html = page.content()
            browser.close()
            print(html)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        scrape(sys.argv[1])
