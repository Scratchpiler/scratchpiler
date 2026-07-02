import os
from pathlib import Path

def clean_and_count_trailing_whitespace(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        total_removed = 0

        with open(file_path, 'w', encoding='utf-8') as f:
            for line in lines:
                # Remove the Mac newline '\n' to isolate the text
                line_no_newline = line.rstrip('\n')
                
                # Strip spaces and tabs
                cleaned_line = line_no_newline.rstrip(' \t')
                
                # Count the difference
                total_removed += len(line_no_newline) - len(cleaned_line)
                
                # Write back with a single newline
                f.write(cleaned_line + '\n')
                
        if total_removed > 0:
            print(f"✅ Successfully cleaned '{file_path}'.")
            print(f"🧹 Trailing whitespaces removed: {total_removed}")
        return total_removed
        
    except UnicodeDecodeError:
        pass # Skip non-utf-8 text files
    except Exception as e:
        print(f"❌ An error occurred processing {file_path}: {e}")
    return 0

if __name__ == '__main__':
    total_removed = 0
    src_dir = Path('src')
    
    if src_dir.is_dir():
        for file_path in src_dir.rglob('*'):
            if file_path.is_file():
                total_removed += clean_and_count_trailing_whitespace(file_path)
        
        print(f"\n🎉 Total trailing whitespaces removed across '{src_dir}': {total_removed}")
    else:
        print(f"❌ Error: '{src_dir}' directory was not found in the current directory.")
