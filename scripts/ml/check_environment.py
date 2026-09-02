import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def check_env():
    print("=" * 65)
    print("PYTHON ENVIRONMENT & MACHINE LEARNING HEALTH CHECK")
    print("=" * 65)
    print(f"Python Version: {sys.version.split()[0]}")
    print(f"Executable:     {sys.executable}\n")

    required_libraries = [
        ("scikit-learn", "sklearn"),
        ("pandas", "pandas"),
        ("numpy", "numpy"),
        ("scipy", "scipy"),
        ("joblib", "joblib"),
        ("matplotlib", "matplotlib"),
        ("seaborn", "seaborn"),
        ("torch (PyTorch)", "torch"),
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
    ]

    print(f"{'Library Name':<20} | {'Status':<12} | {'Installed Version':<18}")
    print("-" * 65)

    all_ok = True
    for display_name, import_name in required_libraries:
        try:
            module = __import__(import_name)
            ver = getattr(module, '__version__', 'Installed')
            print(f"{display_name:<20} | [OK] Ready   | v{ver:<18}")
        except ImportError:
            all_ok = False
            print(f"{display_name:<20} | [X] Missing  | Not Installed")

    print("-" * 65)
    if all_ok:
        print("[SUCCESS] All required Python libraries are FULLY installed and ready!")
    else:
        print("[WARNING] Some libraries are missing. Run: pip install <library>")
    print("=" * 65)

if __name__ == "__main__":
    check_env()
