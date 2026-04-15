export const notImplemented = (_req, res) => {
  res.status(501).json({ message: "Not implemented yet." });
};
