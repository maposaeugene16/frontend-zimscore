import shutil
import os

source = r"C:\Users\Students\Desktop\zimscore-fintech"
destination = r"C:\life projects\zimscore-vanilla"

# Files and directories to copy (excluding .git)
items = [
    "assets",
    "crowdfunding.html",
    "dashboard.html",
    "ecocash-upload.html",
    "index.html",
    "login.html",
    "mfi.html",
    "notifications.html",
    "p2p.html",
    "register.html",
    "score.html",
    "sme.html",
    "wallet.html"
]

if not os.path.exists(destination):
    os.makedirs(destination)

for item in items:
    src_path = os.path.join(source, item)
    dst_path = os.path.join(destination, item)
    
    if os.path.isdir(src_path):
        if os.path.exists(dst_path):
            shutil.rmtree(dst_path)
        shutil.copytree(src_path, dst_path)
    else:
        shutil.copy2(src_path, dst_path)

print(f"Synced {len(items)} items to {destination}")
