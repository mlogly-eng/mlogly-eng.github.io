import os
import re
import urllib.request
import time

HTML_FILE = "index.html"
OUTPUT_HTML = "ophtho_spot_fixed.html"
IMG_FOLDER = "spot_images"

os.makedirs(IMG_FOLDER, exist_ok=True)

with open(HTML_FILE, "r", encoding="utf-8") as f:
    html = f.read()

urls = re.findall(r"img:\s*'(https?://[^']+)'", html)
unique_urls = list(dict.fromkeys(urls))

print(f"Found {len(unique_urls)} unique images to download.\n")

url_to_local = {}

for i, url in enumerate(unique_urls):
    filename = url.split("/")[-1]
    local_path = os.path.join(IMG_FOLDER, filename)

    if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
        print(f"[{i+1}/{len(unique_urls)}] Already exists: {filename}")
        url_to_local[url] = f"{IMG_FOLDER}/{filename}"
        continue

    # Convert thumbnail URL to full-size to avoid rate limiting
    full_url = re.sub(r'/thumb(/[^/]+/[^/]+/[^/]+)/\d+px-[^/]+$', r'\1', url)

    attempts = 3
    success = False
    for attempt in range(attempts):
        try:
            req = urllib.request.Request(full_url, headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://en.wikipedia.org/",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            })
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()
            with open(local_path, "wb") as out:
                out.write(data)
            url_to_local[url] = f"{IMG_FOLDER}/{filename}"
            print(f"[{i+1}/{len(unique_urls)}] Downloaded: {filename}")
            success = True
            break
        except Exception as e:
            if attempt < attempts - 1:
                print(f"[{i+1}/{len(unique_urls)}] Retrying ({attempt+2}/{attempts})...")
                time.sleep(5)
            else:
                print(f"[{i+1}/{len(unique_urls)}] FAILED: {filename} — {e}")
                url_to_local[url] = url

    if success:
        time.sleep(2)

print("\nUpdating HTML file...")
new_html = html
for original_url, local_path in url_to_local.items():
    new_html = new_html.replace(f"'{original_url}'", f"'{local_path}'")

with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
    f.write(new_html)

print(f"\nDone! Open '{OUTPUT_HTML}' in your browser.")
