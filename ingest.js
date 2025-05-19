import fs from 'fs';
import axios from 'axios';

const pdfPath = './sample-data/MVP-Development-Plan.pdf';
const pdfData = fs.readFileSync(pdfPath).toString('base64');



const nexus =  async () => {
  try {
    const response = await axios.post('http://localhost:3000/ingest', {
      pdfData,
      fileName: 'MVP-Development-Plan.pdf'
    });
    console.log(response.data); // Correctly log the response data
  } catch (error) {
    console.error('Error:', error);
    console.error('Error message:', error.message);
  }
}

nexus();