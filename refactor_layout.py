import re

with open('/Users/dhirajrathod/Downloads/email/Phish_filter/components/InboxScanner.tsx', 'r') as f:
    content = f.read()

# 1. Extract Notification Preferences
notify_start = content.find('      {/* ── Notification Preferences ────────────────────────────── */}')
notify_end = content.find('      {/* ── Results Summary ──────────────────────────────────────── */}')
notify_block = content[notify_start:notify_end]

# Remove it from original position
content = content[:notify_start] + content[notify_end:]

# 2. Extract Inbox Summary wrapper and remove the motion.div wrapper
inbox_summary_start = content.find('      {/* ── Inbox Summary ─────────────────────────────────────────── */}')
inbox_summary_end_div = content.find('      </motion.div>\n    </div>\n  );\n}')

# Extract the inner content of Inbox Summary (from <div className="flex items-center gap-3 mb-5"> down to just before the closing motion.div)
inner_start = content.find('        <div className="flex items-center gap-3 mb-5">', inbox_summary_start)
inner_content = content[inner_start:inbox_summary_end_div]

# Remove Inbox Summary from bottom
content = content[:inbox_summary_start]

# 3. Insert inner_content into the Connection Form box
# The Connection Form box ends at:
#         )}
#       </motion.div>
#       {/* ── Results Summary ──────────────────────────────────────── */}

conn_end_idx = content.find('      </motion.div>\n\n      {/* ── Results Summary')
if conn_end_idx == -1:
    conn_end_idx = content.find('      </motion.div>\n      {/* ── Results Summary')

insertion = """
        {/* ── Merged Inbox Summary ── */}
        <hr className="border-white/[0.06] my-8" />
""" + inner_content

content = content[:conn_end_idx] + insertion + content[conn_end_idx:]

# 4. Add Notification Preferences to the very bottom, inside the main w-full container
final_div_idx = content.rfind('    </div>\n  );\n}')
content = content[:final_div_idx] + notify_block + content[final_div_idx:]

with open('/Users/dhirajrathod/Downloads/email/Phish_filter/components/InboxScanner.tsx', 'w') as f:
    f.write(content)
