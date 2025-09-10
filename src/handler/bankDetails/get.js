const getBankDetails = async (request, h) => {
    try {
      const { localAuthority } = request.params
  
      // Call the mock API and pass localAuthority as query param
      const response = await fetch(`https://laps-api-mock-bank-details.dev.cdp-int.defra.cloud/bank-details?localAuthority=${localAuthority}`)
  
      if (!response.ok) {
        throw new Error(`External API error: ${response.status}`)
      }
  
      const data = await response.json()
  
      return h.response(data).code(200)
    } catch (err) {
      console.error('Error fetching bank details:', err)
      return h.response({ error: 'Failed to fetch bank details' }).code(500)
    }
  }
  
  export { getBankDetails }
  