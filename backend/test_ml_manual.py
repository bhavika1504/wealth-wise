
import sys
import os

# Add backend directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from routers.sklearn_models import ExpenseCategorizer, SKLEARN_AVAILABLE
except ImportError as e:
    print(f"Import Error: {e}")
    # Try appending parent directory if running from inside backend
    parent_dir = os.path.dirname(current_dir)
    if parent_dir not in sys.path:
        sys.path.append(parent_dir)
    
    try:
        from backend.routers.sklearn_models import ExpenseCategorizer, SKLEARN_AVAILABLE
    except ImportError as e2:
        print(f"Second Import Error: {e2}")
        sys.exit(1)

def test_categorization():
    print(f"Scikit-learn available: {SKLEARN_AVAILABLE}")
    
    if not SKLEARN_AVAILABLE:
        print("Skipping test as scikit-learn is not installed.")
        print("Please run 'backend/install_dependencies.bat' first.")
        return

    categorizer = ExpenseCategorizer()
    print("Initializing and training default model...")
    categorizer.train_default()
    
    test_cases = [
        "Uber ride to airport",
        "Grocery shopping at Whole Foods",
        "Netflix subscription",
        "Monthly rent payment",
        "Salary deposit",
        "Dinner with friends",
        "New running shoes",
        "Electric bill",
        "Transfer from savings"
    ]
    
    print("\nTesting predictions:")
    print("-" * 60)
    print(f"{'Description':<35} | {'Category':<15} | {'Confidence':<10}")
    print("-" * 60)
    
    for text in test_cases:
        category, confidence = categorizer.predict(text)
        print(f"{text:<35} | {category:<15} | {confidence:.4f}")
    print("-" * 60)

if __name__ == "__main__":
    test_categorization()
