const qs = require('qs');
const crypto = require('crypto');
const axios = require('axios').default;
const fs = require('fs').promises;
const readlineSync = require('readline-sync');

// User local maintenance highway token
let token = '';

const config = {
  /* Service address */
  host: 'https://openapi.tuyaeu.com',
  /* Access Id */
  accessKey: 'gfuhh59jqw9dsf579497',
  /* Access Secret */
  secretKey: '2412fa92b1504d37a8808582787fb1ca',
  /* Interface example device_id */
  deviceId: 'bf5ea5653b53d25405om4d',
  
  uid:'eu1699087415499zCV91',
};

const httpClient = axios.create({
  baseURL: config.host,
  timeout: 5 * 1e3,
});




async function main() {
  try {
    await getToken();

    const outputFolderPath = 'G:\\CSE407 project\\Result';
    const apiResultFileName = 'api_results.csv';

    const numberOfDays = parseInt(readlineSync.question('Enter the number of day: '));

    let cumulativeEnergyUsageAllDays = 0;
    let cumulativeDailyOperatingCostAllDays = 0;

    const day = numberOfDays; // Use the entered number of days directly

    const iterationsPerDay = parseInt(readlineSync.question(`Enter the number of iterations for Day ${day}: `));

    const mainFileName = `data${day}.csv`;

    let totalWattage = 0;
    let totalEnergyUsage = 0;
    let totalDailyOperatingCost = 0;

    for (let i = 0; i < iterationsPerDay; i++) {
      const data = await getDeviceInfo(config.deviceId);

      console.log(`API Result at index ${i}:`);
      console.log(JSON.stringify(data, null, 2)); // Display the full API response
      await saveResultToFile(outputFolderPath, apiResultFileName, JSON.stringify(data, null, 2));
      console.log('API Result saved to file.');

      // Extract voltage, power, and current values
      const voltageCode = 'cur_voltage';
      const powerCode = 'cur_power';
      const currentCode = 'cur_current';

      const voltageIndex = data.result.status.findIndex(status => status.code === voltageCode);
      const powerIndex = data.result.status.findIndex(status => status.code === powerCode);
      const currentIndex = data.result.status.findIndex(status => status.code === currentCode);

      if (voltageIndex !== -1 && powerIndex !== -1 && currentIndex !== -1) {
        const voltageValueString = data.result.status[voltageIndex].value;
        const powerValueString = data.result.status[powerIndex].value;
        const currentValueString = data.result.status[currentIndex].value;

        const voltageValue = parseFloat(voltageValueString) / 10;
        const powerValue = parseFloat(powerValueString) / 10;
        const currentValue = parseFloat(currentValueString) / 1000;

        // Calculate wattage at any minute
        const wattage = voltageValue * currentValue;

        // Save the values to main CSV
        const headers = i === 0 ? `"Iteration","Day","Voltage","Power","Current","Wattage","Energy Usage","Daily Operating Cost","Total Wattage","Total Energy Usage","Total Daily Operating Cost"\n` : '';
        console.log(headers); // Display headers with each iteration
        const energyUsageValue = (wattage / 1000) * 4.14; // Assuming power is in watts, and cost is 4.14 taka per kWh
        const dailyOperatingCost = energyUsageValue * 24; // Assuming the cost is calculated for a day

        cumulativeEnergyUsageAllDays += energyUsageValue;
        cumulativeDailyOperatingCostAllDays += dailyOperatingCost;

        totalWattage += wattage;
        totalEnergyUsage += energyUsageValue;
        totalDailyOperatingCost += dailyOperatingCost;

        // Display calculated values for each iteration
        console.log(`Iteration ${i + 1} - Wattage: ${wattage.toFixed(2)} W, Energy Usage: ${energyUsageValue.toFixed(2)} kWh, Daily Operating Cost: ${dailyOperatingCost.toFixed(2)} taka`);

        const csvData = `${headers}"${i + 1}","${day}","${voltageValue.toFixed(2)}","${powerValue.toFixed(2)}","${currentValue.toFixed(2)}","${wattage.toFixed(2)}","${energyUsageValue.toFixed(2)}","${dailyOperatingCost.toFixed(2)}","${totalWattage.toFixed(2)}","${totalEnergyUsage.toFixed(2)}","${totalDailyOperatingCost.toFixed(2)}"`;

        await saveResultToFile(outputFolderPath, mainFileName, csvData);
        console.log(`Values saved to ${mainFileName}`);

        // Add a delay of 5 seconds (5000 milliseconds) between each iteration
        if (i < iterationsPerDay - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    // Save total calculations for the day to another CSV file
    const totalHeaders = `"","Total Calculations for Day ${day}","Total Wattage","Total Energy Usage","Total Daily Operating Cost"\n`;
    const totalCsvValues = `"","","${totalWattage.toFixed(2)}","${totalEnergyUsage.toFixed(2)}","${totalDailyOperatingCost.toFixed(2)}"`;
    await saveResultToFile(outputFolderPath, `total${day}.csv`, totalHeaders + totalCsvValues);
    console.log(`Total values for Day ${day} saved to total${day}.csv`);

    // Display total calculations for all days
    console.log('\nTotal Calculations for each day:');
    console.log(`Total Wattage: ${cumulativeEnergyUsageAllDays.toFixed(2)} W`);
    console.log(`Total Energy Usage: ${cumulativeEnergyUsageAllDays.toFixed(2)} kWh`);
    console.log(`Total Daily Operating Cost: ${cumulativeDailyOperatingCostAllDays.toFixed(2)} taka`);

    // Save total calculations for all days to another CSV file
    const totalHeadersAllDays = `"","Total Calculations for each day","Total Wattage","Total Energy Usage","Total Daily Operating Cost"\n`;
    const totalCsvValuesAllDays = `"","","${cumulativeEnergyUsageAllDays.toFixed(2)}","${cumulativeEnergyUsageAllDays.toFixed(2)}","${cumulativeDailyOperatingCostAllDays.toFixed(2)}"`;
    await saveResultToFile(outputFolderPath, 'total_all_days.csv', totalHeadersAllDays + totalCsvValuesAllDays);
    console.log('Total values for all days saved to total_all_days.csv');
  } catch (err) {
    throw Error(`ERROR: ${err}`);
  }
}
async function saveResultToFile(outputFolderPath, fileName, data) {
  // Ensure the output folder exists
  try {
    await fs.access(outputFolderPath);
  } catch (err) {
    await fs.mkdir(outputFolderPath, { recursive: true });
  }

  // Specify the path and file name
  const filePath = `${outputFolderPath}\\${fileName}`;

  await fs.appendFile(filePath, data + '\n'); // Use 'await' to ensure the file is written before continuing
  console.log(`Values appended to ${filePath}`);
}

function getValueFromResult(data, code) {
  const index = data.result.status.findIndex(status => status.code === code);
  if (index !== -1) {
    const valueString = data.result.status[index].value;
    return parseFloat(valueString);
  } else {
    console.log(`${code} not found in status array.`);
    return null;
  }
} 



/**
 * fetch highway login token
 */
async function getToken() {
  const method = 'GET';
  const timestamp = Date.now().toString();
  const signUrl = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = [method, contentHash, '', signUrl].join('\n');
  const signStr = config.accessKey + timestamp + stringToSign;

  const headers = {
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    client_id: config.accessKey,
    sign: await encryptStr(signStr, config.secretKey),
  };
  const { data: login } = await httpClient.get('/v1.0/token?grant_type=1', { headers });
  if (!login || !login.success) {
    throw Error(`Authorization Failed: ${login.msg}`);
  }
  token = login.result.access_token;
}

/**
 * fetch highway business data
 */
async function getDeviceInfo(deviceId) {
  const query = {};
  const method = 'GET';
  const url = `/v1.0/devices/${deviceId}`;
  //const url = `/v1.0/devices/status?device_ids=${deviceId}`;
  //const url = `/v1.0/devices/device_ids=${deviceId}/functions`;
  
  const reqHeaders = await getRequestSign(url, method, {}, query);

  const { data } = await httpClient.request({
    method,
    data: {},
    params: {},
    headers: reqHeaders,
    url: reqHeaders.path,
  });
  if (!data || !data.success) {
    throw Error(`Request highway Failed: ${data.msg}`);
  }
  return data;
}

/**
 * HMAC-SHA256 crypto function
 */
async function encryptStr(str, secret) {
  return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

/**
 * Request signature, which can be passed as headers
 * @param path
 * @param method
 * @param headers
 * @param query
 * @param body
 */
async function getRequestSign(path, method, headers = {}, query = {}, body = {}) {
  const t = Date.now().toString();
  const [uri, pathQuery] = path.split('?');
  const queryMerged = Object.assign(query, qs.parse(pathQuery));
  const sortedQuery = {};
  Object.keys(queryMerged)
    .sort()
    .forEach((i) => (sortedQuery[i] = query[i]));

  const querystring = decodeURIComponent(qs.stringify(sortedQuery));
  const url = querystring ? `${uri}?${querystring}` : uri;
  const contentHash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const stringToSign = [method, contentHash, '', url].join('\n');
  const signStr = config.accessKey + token + t + stringToSign;
  return {
    t,
    path: url,
    client_id: config.accessKey,
    sign: await encryptStr(signStr, config.secretKey),
    sign_method: 'HMAC-SHA256',
    access_token: token,
  };
}

main().catch(err => {
  throw Error(`ERROR: ${err}`);
});
