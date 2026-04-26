with open('components/InboxScanner.tsx', 'r') as f:
    lines = f.readlines()

# Find Connection Form start
conn_start = -1
for i, l in enumerate(lines):
    if "── Connection Form" in l:
        conn_start = i
        break

# Find Results Summary start
res_start = -1
for i, l in enumerate(lines):
    if "── Results Summary" in l:
        res_start = i
        break

# Find Inbox Summary start
inbox_start = -1
for i, l in enumerate(lines):
    if "── Inbox Summary" in l:
        inbox_start = i
        break

# Find end of Inbox Summary
inbox_end = len(lines) - 4  # The file ends with 4 lines of closing tags

print(f"conn: {conn_start}, res: {res_start}, inbox: {inbox_start}, end: {inbox_end}")

# Structure:
# Up to conn_start
# + Left Column start
# + [conn_start : res_start]
# + [inbox_start : inbox_end]
# + Left Column end, Right Column start
# + Empty State
# + [res_start : inbox_start]
# + Right Column end, Main end

empty_state = """
        {!summary && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(255,255,255,0.1)] bg-[#161616]/50 p-12 min-h-[400px]"
          >
            <motion.div
              animate={{ 
                y: [0, -10, 0],
                rotateZ: [0, -2, 2, 0]
              }}
              transition={{ 
                duration: 4,
                repeat: float('inf'),
                ease: "easeInOut"
              }}
              className="w-24 h-32 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] shadow-xl relative mb-6 flex items-center justify-center"
            >
              <div className="absolute top-4 left-4 right-4 h-2 bg-white/[0.05] rounded-full" />
              <div className="absolute top-8 left-4 right-8 h-2 bg-white/[0.05] rounded-full" />
              <div className="absolute top-12 left-4 right-12 h-2 bg-white/[0.05] rounded-full" />
              
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: float('inf') }}
                className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center"
              >
                <span className="text-accent text-xl">🔍</span>
              </motion.div>
            </motion.div>
            <h3 className="text-lg font-medium text-[#f5f5f5] mb-2">Report Document</h3>
            <p className="text-sm text-[#a3a3a3] text-center max-w-xs">
              Scan your inbox or test connection to view the detailed threat analysis report here.
            </p>
          </motion.div>
        )}
"""
empty_state_lines = [l + "\n" for l in empty_state.strip("\n").split("\n")]

new_lines = []
new_lines.extend(lines[:conn_start])
new_lines.append('      {/* ── Left Column ── */}\n')
new_lines.append('      <div className="space-y-6 flex flex-col min-w-0">\n')
new_lines.extend(lines[conn_start:res_start])
new_lines.extend(lines[inbox_start:inbox_end])
new_lines.append('      </div>\n')
new_lines.append('      {/* ── Right Column ── */}\n')
new_lines.append('      <div className="space-y-6 flex flex-col min-w-0">\n')
new_lines.extend(empty_state_lines)
new_lines.extend(lines[res_start:inbox_start])
new_lines.append('      </div>\n')
new_lines.extend(lines[inbox_end:])

with open('components/InboxScanner.tsx', 'w') as f:
    f.writelines(new_lines)

print("Layout correctly rewritten.")
