import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const firstNames = [
  'Aarav', 'Aditi', 'Amit', 'Ananya', 'Anil', 'Anita', 'Ansh', 'Arjun', 'Bhavna', 'Chetan',
  'Deepak', 'Dev', 'Divya', 'Gaurav', 'Geeta', 'Harish', 'Isha', 'Jagdish', 'Kavita', 'Kiran',
  'Manoj', 'Meera', 'Mukesh', 'Neha', 'Nikhil', 'Nisha', 'Pooja', 'Pradeep', 'Prakash', 'Priya',
  'Rahul', 'Rajesh', 'Rakesh', 'Ramesh', 'Ravi', 'Rekha', 'Ritu', 'Rohit', 'Sachin', 'Sameer',
  'Sanjay', 'Santosh', 'Seema', 'Shilpa', 'Sneha', 'Sunil', 'Suresh', 'Varun', 'Vikas', 'Vishal'
];

const lastNames = [
  'Agarwal', 'Banerjee', 'Bhatia', 'Chauhan', 'Deshmukh', 'Gupta', 'Iyer', 'Jadhav', 'Jain', 'Jha',
  'Joshi', 'Kapoor', 'Khan', 'Kulkarni', 'Kumar', 'Mehta', 'Mishra', 'Mukherjee', 'Nair', 'Pandey',
  'Patel', 'Patil', 'Pawar', 'Prasad', 'Rao', 'Reddy', 'Roy', 'Sarin', 'Sen', 'Shah',
  'Sharma', 'Shinde', 'Singh', 'Sinha', 'Trivedi', 'Upadhyay', 'Varma', 'Verma', 'Yadav', 'Zaveri'
];

const companies = [
  'Apex Automation Systems', 'Bharat Forge & Heavy Engineering', 'Zenith Process Controls',
  'Tata Steel & Alloys', 'L&T Industrial Automation', 'Kirloskar Fluid Systems',
  'Thermax Heat Solutions', 'Precision Machine Tools', 'Siemens Channel Partner',
  'ABB Drive Systems India', 'Schneider Industrial Tech', 'Endress Fluidics India',
  'Havells Power & Automation', 'Godrej Tooling & Plant Equipment', 'Bajaj Electricals Industrial',
  'Reliance Petrochem Systems', 'Mahindra Industrial Machinery', 'Voltas Industrial Solutions',
  'Adani Port Machinery & Cranes', 'Jindal Steel & Power Systems'
];

const designations = [
  'Plant Head', 'Procurement Manager', 'Chief Automation Engineer', 'Maintenance Lead',
  'Operations Director', 'Purchase Officer', 'Managing Director', 'Technical Lead',
  'Quality Assurance Manager', 'Electrical Project Lead', 'Instrumentation Engineer', 'General Manager - Works'
];

const locations = [
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Nagpur', state: 'Maharashtra' },
  { city: 'Nashik', state: 'Maharashtra' },
  { city: 'Ahmedabad', state: 'Gujarat' },
  { city: 'Vadodara', state: 'Gujarat' },
  { city: 'Surat', state: 'Gujarat' },
  { city: 'Rajkot', state: 'Gujarat' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Mysuru', state: 'Karnataka' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Coimbatore', state: 'Tamil Nadu' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'New Delhi', state: 'Delhi' },
  { city: 'Gurugram', state: 'Haryana' },
  { city: 'Faridabad', state: 'Haryana' },
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Kanpur', state: 'Uttar Pradesh' },
  { city: 'Kolkata', state: 'West Bengal' },
  { city: 'Jaipur', state: 'Rajasthan' }
];

const TOTAL_CONTACTS = 20000;
const START_PHONE = 9820000001n; // 10 digit Indian mobile starting with 982

const lines = ['Name,Phone,Company,Designation,City,State'];

for (let i = 0; i < TOTAL_CONTACTS; i++) {
  const fn = firstNames[i % firstNames.length];
  const ln = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
  const name = `${fn} ${ln}`;
  const phone = `+91${(START_PHONE + BigInt(i)).toString()}`;
  const company = companies[i % companies.length];
  const designation = designations[i % designations.length];
  const loc = locations[i % locations.length];

  // CSV escape if needed (though our sample strings don't contain quotes or commas except company)
  const escapedName = `"${name}"`;
  const escapedPhone = phone;
  const escapedCompany = `"${company}"`;
  const escapedDesignation = `"${designation}"`;
  const escapedCity = `"${loc.city}"`;
  const escapedState = `"${loc.state}"`;

  lines.push(`${escapedName},${escapedPhone},${escapedCompany},${escapedDesignation},${escapedCity},${escapedState}`);
}

const csvContent = lines.join('\r\n');

// Write to root workspace and public directory
const rootPath = resolve(__dirname, '..', 'dummy-contacts-20000.csv');
const publicDir = resolve(__dirname, '..', 'public');
const publicPath = resolve(publicDir, 'dummy-contacts-20000.csv');

writeFileSync(rootPath, csvContent, 'utf-8');
console.log(`Generated: ${rootPath} (${lines.length - 1} contacts, ${(Buffer.byteLength(csvContent) / 1024 / 1024).toFixed(2)} MB)`);

try {
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(publicPath, csvContent, 'utf-8');
  console.log(`Generated: ${publicPath}`);
} catch (err) {
  console.error(`Failed to write to public:`, err);
}
