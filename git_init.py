import subprocess
import os

target_dir = r"C:\life projects\zimscore-vanilla"

def run_git(args):
    result = subprocess.run(["git"] + args, cwd=target_dir, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running git {' '.join(args)}: {result.stderr}")
    else:
        print(result.stdout)

if not os.path.exists(os.path.join(target_dir, ".git")):
    run_git(["init"])
    run_git(["add", "."])
    run_git(["commit", "-m", "Initial commit of Vanilla implementation"])
    run_git(["branch", "-M", "main"])
    print("Git initialized and first commit created.")
else:
    print("Git already initialized.")
