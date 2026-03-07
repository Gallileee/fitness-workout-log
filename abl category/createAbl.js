async function CreateAbl(req, res) {
  try {
    let category = req.body
    console.log('Received category data:', category)
    // Here you would typically save the category to a database
    // For this example, we'll just return the received data
    res.json({ status: 'success', category: category })
  } catch (error) {
    console.error('Error creating category:', error)
    res.status(500).json({ status: 'error', message: 'Internal Server Error' })
  }
}

module.exports = CreateAbl

try {
  module.exports = CreateAbl
} catch (error) {
  console.error('Error exporting CreateAbl:', error)
}

