// Names functions from traceback-table data, sets the TOC register, then
// decompiles every function to a single C file.
// Script args: <functions.tsv> <out.c> <tocOffsetIntoData> <spriteFuncs.txt>
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;
import ghidra.program.model.lang.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.math.BigInteger;
import java.util.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.Function.FunctionUpdateType;

public class DecompileAll extends GhidraScript {
    public void run() throws Exception {
        String[] args = getScriptArgs();
        String funcsTsv = args[0];
        String outPath = args[1];
        long tocOff = Long.parseLong(args[2]);

        MemoryBlock codeBlk = null, dataBlk = null;
        for (MemoryBlock b : currentProgram.getMemory().getBlocks()) {
            println("block " + b.getName() + " " + b.getStart() + "-" + b.getEnd() + " x=" + b.isExecute() + " init=" + b.isInitialized());
            if (b.isExecute() && codeBlk == null) codeBlk = b;
            else if (!b.isExecute() && dataBlk == null && !b.getName().equals("IMPORTS")) dataBlk = b;
        }
        Address codeStart = codeBlk.getStart();
        Address toc = dataBlk.getStart().add(tocOff);
        println("code=" + codeStart + " data=" + dataBlk.getStart() + " toc=" + toc);

        // set r2 everywhere in code
        Register r2 = currentProgram.getRegister("r2");
        currentProgram.getProgramContext().setValue(r2, codeBlk.getStart(), codeBlk.getEnd(),
            BigInteger.valueOf(toc.getOffset()));

        // apply names
        BufferedReader br = new BufferedReader(new FileReader(funcsTsv));
        String line;
        FunctionManager fm = currentProgram.getFunctionManager();
        List<Address> starts = new ArrayList<>();
        while ((line = br.readLine()) != null) {
            String[] parts = line.split("\t");
            long start = Long.parseLong(parts[0], 16) - 0x10000000L;
            String name = parts[2].replaceFirst("^\\.s?", "");
            if (parts[2].startsWith(".s") && !Character.isUpperCase(parts[2].charAt(2))) name = parts[2].substring(1);
            Address a = codeStart.add(start);
            starts.add(a);
            Function f = fm.getFunctionAt(a);
            if (f == null) {
                disassemble(a);
                f = createFunction(a, name);
            }
            if (f != null) f.setName(name, SourceType.USER_DEFINED);
        }
        br.close();
        analyzeChanges(currentProgram);

        // --- switch jump tables (Ghidra misses TOC-relative tables) ---------
        Map<Address, List<Address>> jumpTables = new LinkedHashMap<>();
        if (args.length > 4) {
            BufferedReader jbr = new BufferedReader(new FileReader(args[4]));
            String jl;
            while ((jl = jbr.readLine()) != null) {
                String[] p = jl.split("\t");
                Address from = codeStart.add(Long.parseLong(p[0], 16) - 0x10000000L);
                List<Address> dests = new ArrayList<>();
                for (String t : p[3].split(",")) dests.add(codeStart.add(Long.parseLong(t, 16) - 0x10000000L));
                jumpTables.put(from, dests);
                ReferenceManager rm = currentProgram.getReferenceManager();
                for (Address d : new LinkedHashSet<>(dests)) {
                    disassemble(d);
                    rm.addMemoryReference(from, d, RefType.COMPUTED_JUMP, SourceType.USER_DEFINED, 0);
                }
            }
            jbr.close();
            analyzeChanges(currentProgram);
            for (Map.Entry<Address, List<Address>> e : jumpTables.entrySet()) {
                Function f = fm.getFunctionContaining(e.getKey());
                if (f == null) { println("no func for jumptable " + e.getKey()); continue; }
                ghidra.app.cmd.function.CreateFunctionCmd.fixupFunctionBody(currentProgram, f, monitor);
                try {
                    new ghidra.program.model.pcode.JumpTable(e.getKey(), new ArrayList<>(e.getValue()), true).writeOverride(f);
                } catch (Exception ex) { println("override " + e.getKey() + ": " + ex); }
                println("jumptable " + e.getKey() + " in " + f.getName() + " (" + e.getValue().size() + ")");
            }
        }

        // --- Sprite struct ------------------------------------------------
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        StructureDataType rect = new StructureDataType("Rect", 8);
        rect.replaceAtOffset(0, ShortDataType.dataType, 2, "top", null);
        rect.replaceAtOffset(2, ShortDataType.dataType, 2, "left", null);
        rect.replaceAtOffset(4, ShortDataType.dataType, 2, "bottom", null);
        rect.replaceAtOffset(6, ShortDataType.dataType, 2, "right", null);
        DataType rectDt = dtm.addDataType(rect, DataTypeConflictHandler.REPLACE_HANDLER);
        StructureDataType st = new StructureDataType("Sprite", 100);
        String[][] fields = {
            {"0","image"},{"2","f02"},{"4","frame"},{"6","inUse"},{"8","f08"},
            {"26","frameW"},{"28","frameH"},{"30","type"},{"36","vy"},{"38","vx"},
            {"60","num"},{"62","action1"},{"64","action2"},{"66","f42"},{"68","f44"},{"70","doDraw"},
            {"72","f48"},{"74","f4a"},{"76","f4c"},{"78","f4e"},{"80","dir"},{"82","world"},{"84","f54"},
            {"86","f56"},{"88","f58"},{"90","f5a"},{"92","f5c"},{"94","f5e"},{"96","f60"},{"98","f62"}};
        for (String[] fd : fields) st.replaceAtOffset(Integer.parseInt(fd[0]), ShortDataType.dataType, 2, fd[1], null);
        st.replaceAtOffset(10, rectDt, 8, "rect", null);
        st.replaceAtOffset(18, rectDt, 8, "oldRect", null);
        st.replaceAtOffset(32, new PointerDataType(VoidDataType.dataType), 4, "proc", null);
        st.replaceAtOffset(40, new ArrayDataType(ShortDataType.dataType, 10, 2), 20, "info", null);
        DataType spriteDt = dtm.addDataType(st, DataTypeConflictHandler.REPLACE_HANDLER);
        Address sprArr = dataBlk.getStart().add(0x10040504L - 0x1003cab0L);
        try { clearListing(sprArr, sprArr.add(200 * 100 - 1)); createData(sprArr, new ArrayDataType(spriteDt, 200, 100)); createLabel(sprArr, "gSprites", true); }
        catch (Exception e) { println("sprite array: " + e); }
        Set<String> spriteFuncs = new HashSet<>();
        BufferedReader sbr = new BufferedReader(new FileReader(args[3]));
        String sl; while ((sl = sbr.readLine()) != null) spriteFuncs.add(sl.trim());
        sbr.close();
        for (Function f : fm.getFunctions(true)) {
            String n = f.getName().replaceFirst("^\\.", "");
            if (!spriteFuncs.contains(n)) continue;
            try {
                ParameterImpl prm = new ParameterImpl("s", new PointerDataType(spriteDt), currentProgram);
                f.replaceParameters(FunctionUpdateType.DYNAMIC_STORAGE_FORMAL_PARAMS, true, SourceType.USER_DEFINED, prm);
            } catch (Exception e) { println("param " + n + ": " + e); }
        }

        PrintWriter pw = new PrintWriter(new FileWriter(outPath));
        DecompInterface di = new DecompInterface();
        DecompileOptions opts = new DecompileOptions();
        di.setOptions(opts);
        di.openProgram(currentProgram);
        for (Address a : starts) {
            Function f = fm.getFunctionAt(a);
            if (f == null) { pw.println("// no function at " + a); continue; }
            DecompileResults r = di.decompileFunction(f, 120, monitor);
            pw.println("// ==== " + f.getName() + " @ " + a + " (orig " + Long.toHexString(a.subtract(codeStart) + 0x10000000L) + ")");
            if (r != null && r.decompileCompleted()) pw.println(r.getDecompiledFunction().getC());
            else pw.println("// decompile failed: " + (r == null ? "null" : r.getErrorMessage()));
        }
        pw.close();
        println("done");
    }
}
