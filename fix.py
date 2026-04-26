with open('components/InboxScanner.tsx', 'r') as f:
    content = f.read()

# Replace the end to include the extra closing div
content = content.replace(
    '      </motion.div>\n    </div>\n  );\n}',
    '      </motion.div>\n      </div>\n    </div>\n  );\n}'
)

with open('components/InboxScanner.tsx', 'w') as f:
    f.write(content)

print("Fixed layout closing tags")
