import Layout from '../models/Layout.js';

export const createLayout = async (req, res) => {
  try {
    const layout = new Layout(req.body);
    const saved = await layout.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getLayouts = async (req, res) => {
  try {
    const layouts = await Layout.find();
    res.json(layouts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
