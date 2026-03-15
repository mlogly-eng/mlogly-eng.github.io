import os
import re
import urllib.request
import urllib.parse
import time
import json

HTML_FILE = "index.html"
OUTPUT_HTML = "ophtho_spot_fixed.html"
IMG_FOLDER = "spot_images"

os.makedirs(IMG_FOLDER, exist_ok=True)

with open(HTML_FILE, "r", encoding="utf-8") as f:
    html = f.read()

urls = re.findall(r"img:\s*'(https?://[^']+)'", html)
unique_urls = list(dict.fromkeys(urls))
wiki_urls = [u for u in unique_urls if 'wikimedia' in u or 'wikipedia' in u]

print(f"Found {len(wiki_urls)} Wikipedia images to download.\n")

url_to_local = {}
for url in unique_urls:
    if 'wikimedia' not in url and 'wikipedia' not in url:
        url_to_local[url] = url

def download_via_api(real_filename):
    api_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "titles": f"File:{real_filename}",
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json"
    }
    query = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"{api_url}?{query}",
        headers={"User-Agent": "VentMed/1.0 (educational medical platform)", "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read())
    pages = data.get("query", {}).get("pages", {})
    for page in pages.values():
        info = page.get("imageinfo", [{}])[0]
        return info.get("url")
    return None

for i, url in enumerate(wiki_urls):
    real_filename = re.sub(r'^\d+px-', '', url.split("/")[-1])
    local_path = os.path.join(IMG_FOLDER, real_filename)

    if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
        print(f"[{i+1}/{len(wiki_urls)}] Already exists: {real_filename}")
        url_to_local[url] = f"{IMG_FOLDER}/{real_filename}"
        continue

    success = False

    # Method 1: direct thumbnail URL
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": "VentMed/1.0 (educational; https://ventmed.onrender.com)",
                "Referer": "https://en.wikipedia.org/",
            })
            with urllib.request.urlopen(req, timeout=25) as resp:
                data = resp.read()
            if len(data) > 1000:
                with open(local_path, "wb") as out:
                    out.write(data)
                url_to_local[url] = f"{IMG_FOLDER}/{real_filename}"
                print(f"[{i+1}/{len(wiki_urls)}] ✓ {real_filename} ({len(data)//1024}KB)")
                success = True
                break
        except Exception as e:
            if attempt < 2:
                wait = 12 + attempt * 12
                print(f"[{i+1}/{len(wiki_urls)}] Attempt {attempt+1} failed, waiting {wait}s...")
                time.sleep(wait)

    # Method 2: Wikimedia Commons API
    if not success:
        try:
            print(f"[{i+1}/{len(wiki_urls)}] Trying Commons API for {real_filename}...")
            time.sleep(3)
            direct_url = download_via_api(real_filename)
            if direct_url:
                req = urllib.request.Request(direct_url, headers={
                    "User-Agent": "VentMed/1.0 (educational; https://ventmed.onrender.com)",
                })
                with urllib.request.urlopen(req, timeout=25) as resp:
                    data = resp.read()
                if len(data) > 1000:
                    with open(local_path, "wb") as out:
                        out.write(data)
                    url_to_local[url] = f"{IMG_FOLDER}/{real_filename}"
                    print(f"[{i+1}/{len(wiki_urls)}] ✓ API: {real_filename} ({len(data)//1024}KB)")
                    success = True
        except Exception as e:
            print(f"[{i+1}/{len(wiki_urls)}] API failed: {e}")

    if not success:
        print(f"[{i+1}/{len(wiki_urls)}] ✗ FAILED: {real_filename}")
        url_to_local[url] = url

    time.sleep(3)

print("\nUpdating HTML...")
new_html = html
for original_url, local_path in url_to_local.items():
    new_html = new_html.replace(f"'{original_url}'", f"'{local_path}'")

with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
    f.write(new_html)

failed = [u for u, p in url_to_local.items() if p == u and ('wikimedia' in u or 'wikipedia' in u)]
print(f"\n✓ {len(wiki_urls) - len(failed)}/{len(wiki_urls)} downloaded.")
if failed:
    print(f"✗ {len(failed)} failed:")
    for u in failed:
        print(f"  {u.split('/')[-1]}")
print(f"\nSaved to '{OUTPUT_HTML}' — rename to index.html and push.")
