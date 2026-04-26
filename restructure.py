with open('components/InboxScanner.tsx', 'r') as f:
    content = f.read()

# The old Inbox Summary content starts at the stray ">" on line 412
# and ends just before the empty state check "{!summary && results.length === 0"
# Let me find the exact boundaries

# Find the stray ">" + old inbox summary content
old_summary_start = content.find('      >\n        <div className="flex items-center gap-3 mb-5">\n          <div className="w-10 h-10')
if old_summary_start == -1:
    print("ERROR: Could not find old summary start")
    exit(1)

# Find where the old summary ends - right before the empty state
old_summary_end_marker = "        {!summary && results.length === 0 && ("
old_summary_end = content.find(old_summary_end_marker)
if old_summary_end == -1:
    print("ERROR: Could not find old summary end")
    exit(1)

# Extract the inbox summary JSX content (without the stray ">")
summary_jsx = content[old_summary_start + len('      >\n'):old_summary_end]
print(f"Extracted summary JSX: {len(summary_jsx)} chars")
print(f"First 100 chars: {repr(summary_jsx[:100])}")

# Remove the old summary from its current position (including the stray ">")
content = content[:old_summary_start] + "\n" + content[old_summary_end:]

# Now replace the INBOX_SUMMARY_PLACEHOLDER with the actual content
content = content.replace('        INBOX_SUMMARY_PLACEHOLDER\n', summary_jsx)

with open('components/InboxScanner.tsx', 'w') as f:
    f.write(content)

print("Restructured successfully!")
