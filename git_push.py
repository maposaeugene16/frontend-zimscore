import subprocess
import os

target_dir = r"C:\life projects\zimscore-vanilla"
remote_url = "https://github.com/Eugene-maposa/zimscore-vanilla.git"

def run_git(args):
    result = subprocess.run(["git"] + args, cwd=target_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running git {' '.join(args)}: {result.stderr}")
        return False
    else:
        print(result.stdout)
        return True

# Add remote if not exists
run_git(["remote", "add", "origin", remote_url])

# Push
print("Attempting to push to GitHub...")
if run_git(["push", "-u", "origin", "main"]):
    print("Success! The code has been pushed to zimscore-vanilla.")
else:
    print("Push failed. Check if the repository exists on GitHub and if you have the correct permissions.")
