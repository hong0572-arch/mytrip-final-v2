import io

def main():
    try:
        with io.open('src/components/AIResult.js', 'r', encoding='utf-8') as f:
            content = f.read()

        with io.open('new_return.jsx', 'r', encoding='utf-8') as f:
            new_ui = f.read()

        start_str = '    return (\n        <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center overflow-hidden relative font-sans">'
        if start_str not in content:
            start_str = start_str.replace('\n', '\r\n')
            if start_str not in content:
                print("Could not find start str")
                return

        end_str = '            {/* PDF 변환용 숨겨진 A4 서식 유지 */}'
        if end_str not in content:
            print("Could not find end str")
            return

        start_idx = content.find(start_str)
        end_idx = content.find(end_str)

        before = content[:start_idx]
        after = content[end_idx:]

        new_content = before + new_ui + '\n' + after

        with io.open('src/components/AIResult.js', 'w', encoding='utf-8') as f:
            f.write(new_content)

        print("Patch successful!")

    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
