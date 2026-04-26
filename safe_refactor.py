with open('/Users/dhirajrathod/Downloads/email/Phish_filter/components/InboxScanner.tsx', 'r') as f:
    lines = f.readlines()

# Find bounds
conn_start = -1
conn_end = -1
notify_start = -1
notify_end = -1
summary_start = -1
summary_end = -1

for i, line in enumerate(lines):
    if "── Connection Form ──" in line:
        conn_start = i
    if "── Notification Preferences ──" in line:
        notify_start = i
    if "── Results Summary ──" in line:
        notify_end = i - 1  # end of notification block is right before results summary
    if "── Inbox Summary ──" in line:
        summary_start = i
    if line.strip() == "</div>" and lines[i-1].strip() == "</motion.div>" and "return (" in "".join(lines[:1000]):
        # This is tricky. Let's find exactly `</motion.div>\n    </div>\n  );\n}`
        pass

for i in range(len(lines)):
    if "".join(lines[i:i+4]) == "      </motion.div>\n    </div>\n  );\n}\n":
        summary_end = i + 1

# Extract the notify block
notify_block = lines[notify_start:notify_end]

# Extract the inner contents of summary block
# Look for <div className="flex items-center gap-3 mb-5"> inside summary_start...summary_end
inner_summary_start = -1
for i in range(summary_start, summary_end):
    if '<div className="flex items-center gap-3 mb-5">' in lines[i]:
        inner_summary_start = i
        break

inner_summary_end = summary_end - 1 # right before the closing </motion.div>
inner_summary_block = lines[inner_summary_start:inner_summary_end]

# Now let's construct the new file
new_lines = []

# Up to notify_start
new_lines.extend(lines[:notify_start])

# Skip notify_block (we'll add it at the bottom)
# Go from notify_end to summary_start
# Wait, we need to insert inner_summary_block into the end of Connection Form.
# Where does Connection Form end? Right before notify_start!
# Specifically, at `      </motion.div>\n` before `      {/* ── Notification Preferences`

# Let's rebuild carefully.
# Connection Form ends at the `</motion.div>` before notify_start.
conn_end_idx = notify_start - 1
while "</motion.div>" not in lines[conn_end_idx]:
    conn_end_idx -= 1

# From 0 to conn_end_idx (exclusive)
new_lines = lines[:conn_end_idx]

# Add divider and inner summary block
new_lines.append('        {/* ── Historical Summary ── */}\n')
new_lines.append('        <hr className="border-white/[0.06] my-8" />\n')
new_lines.extend(inner_summary_block)
new_lines.append('      </motion.div>\n') # close Connection Form div

# Now add Results Summary and Email List (from notify_end to summary_start)
new_lines.extend(lines[notify_end:summary_start])

# Add notify_block here
new_lines.extend(notify_block)

# Close the main container
new_lines.append('    </div>\n')
new_lines.append('  );\n')
new_lines.append('}\n')

with open('/Users/dhirajrathod/Downloads/email/Phish_filter/components/InboxScanner.tsx', 'w') as f:
    f.writelines(new_lines)
