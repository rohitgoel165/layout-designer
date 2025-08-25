import XLSX from 'xlsx';

export const uploadExcel = (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    res.json(jsonData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
