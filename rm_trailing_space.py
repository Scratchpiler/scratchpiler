filename = 'scratchpiler.user.js'

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
                
        print(f"✅ Successfully cleaned '{file_path}'.")
        print(f"🧹 Total trailing whitespaces removed: {total_removed}")
        
    except FileNotFoundError:
        print(f"❌ Error: '{file_path}' was not found in the current directory.")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == '__main__':
    clean_and_count_trailing_whitespace(filename)
