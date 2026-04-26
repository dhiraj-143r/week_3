import re

with open('components/InboxScanner.tsx', 'r') as f:
    content = f.read()

# Replace the top div
content = content.replace(
    '<div className="w-full max-w-4xl mx-auto space-y-6">',
    '<div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 items-start">\n      {/* ── Left Column ── */}\n      <div className="space-y-6 flex flex-col min-w-0">'
)

# Find the Inbox Summary block
summary_start = content.find('{/* ── Inbox Summary')
if summary_start != -1:
    # Find the end of the Inbox Summary block which ends before the final </div>\n  );
    # Since we know the file structure, it ends at </motion.div>\n    </div>\n  );\n}
    # But wait, there is a })\n              </div>\n            </div>\n          </motion.div>\n        )}\n      </motion.div>
    summary_end_match = re.search(r'</motion\.div>\n\s*\}\)\n\s*</div>\n\s*</div>\n\s*</motion\.div>\n\s*\)\}\n\s*</motion\.div>', content)
    if summary_end_match:
        summary_end = summary_end_match.end()
        summary_block = content[summary_start:summary_end]
        
        # Remove the summary block from its current position
        content = content[:summary_start] + content[summary_end:]
        
        # Find where to insert it (after Connection Form)
        # Connection form ends at:
        #               />
        #             </div>
        #           </motion.div>
        #         )}
        #       </motion.div>
        #
        #       {/* ── Results Summary
        insert_pos = content.find('{/* ── Results Summary')
        if insert_pos != -1:
            # We need to close the left column and open the right column here!
            new_insert = f"""
        {summary_block}
      </div>

      {{/* ── Right Column ── */}}
      <div className="space-y-6 flex flex-col min-w-0">
      """
            content = content[:insert_pos] + new_insert + content[insert_pos:]

with open('components/InboxScanner.tsx', 'w') as f:
    f.write(content)

print("Rewrote layout successfully")
