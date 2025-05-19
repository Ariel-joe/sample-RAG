const fs = require('fs');
const axios = require('axios');

const pdfPath = './sample-data/employee-handbook.pdf';
const pdfData = fs.readFileSync(pdfPath).toString('base64');

axios.post('http://localhost:3000/ingest', {
  pdfData,
  fileName: 'employee-handbook.pdf'
})
.then(response => console.log(response.data))
.catch(error => console.error(error.response.data));