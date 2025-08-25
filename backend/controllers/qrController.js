import QRCode from 'qrcode';

export const generateQRCode = async (req, res) => {
  try {
    const { text } = req.body;
    const qrDataUrl = await QRCode.toDataURL(text);
    res.json({ qrCode: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
