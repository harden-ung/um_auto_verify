const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const puppeteerCloak = require('puppeteer-cloak')

const faker = require('faker')
const figlet = require('figlet')
const chalk = require('chalk')

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const { uniqueNamesGenerator, names } = require('unique-names-generator')

const config = {
  dictionaries: [names],
}

const fs = require('fs-extra')

// settings
const { headless, devMode } = require('./settings.json')

// import accounts
const proxies = fs
  .readFileSync('./proxies.txt')
  .toString()
  .split('\r\n')
  .filter((proxy) => proxy !== '')

const rawData = fs
  .readFileSync('./data.txt')
  .toString()
  .split('\r\n')
  .filter((datum) => datum !== '')

const data = rawData.map((rawDatum) => {
  const [email, password, verifyLink1, verifyLink2] = rawDatum.split(':')
  return { email, password, verifyLink: `${verifyLink1}:${verifyLink2}` }
})

// report json
const defaultErrorData = require('./reports/errorData.json')
const defaultUsedData = require('./reports/usedData.json')

// app states
let usedData = [...defaultUsedData]
let errorData = [...defaultErrorData]

// support functions
function checkForDuplicates(array) {
  return new Set(array).size !== array.length
}
const checkSettings = async () => {
  console.log('settings checked!!!')
}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const getRandomName = (string, length) => {
  let nameLength = length
  snippet = string.replace(/[^a-zA-Z]/g, '').toLowerCase()

  const start = Math.floor(Math.random() * (snippet.length - 1 - nameLength))

  const end =
    start + 1 + nameLength > snippet.length
      ? snippet.length - start
      : start + nameLength

  return capitalize(snippet.substring(start, end))
}
function getRandomFromArr(arr, n) {
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len)
  if (n > len)
    throw new RangeError('getRandom: more elements taken than available')
  while (n--) {
    var x = Math.floor(Math.random() * len)
    result[n] = arr[x in taken ? taken[x] : x]
    taken[x] = --len in taken ? taken[len] : len
  }
  return result
}
const getRandom = (numb1, numb2) => {
  let high = numb1 > numb2 ? numb1 : numb2
  let low = numb1 < numb2 ? numb1 : numb2
  return Math.round(Math.random() * (high - low)) + low
}
const startNoti = () => {
  console.log(
    chalk.green(
      figlet.textSync('enne', {
        font: 'Ghost',
        horizontalLayout: 'default',
        verticalLayout: 'default',
        whitespaceBreak: true,
      }),
    ),
  )
  console.log('start tool ...')
}
const endNoti = () => {
  console.log('done...')
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
const enhance = (processName, process) => {
  return async (...args) => {
    let timeCounter = 0
    const timeCounterInterval = setInterval(() => {
      timeCounter = timeCounter + 100
    }, 100)
    try {
      console.log(`---${processName} start---`.toUpperCase())
      await process(...args)
      await sleep(1000)
      console.log(`---${processName} end---`.toUpperCase())
    } catch (error) {
      console.log(`${processName} error:`, error)
      throw '500 Internal Service Error'
    } finally {
      console.log(
        `${processName} time: `,
        chalk.black.bgGreen(` ${(timeCounter / 1000).toFixed(1)}s `),
      )
      clearTimeout(timeCounterInterval)
    }
  }
}

const generateData = async (data) => {
  // verifyLink
  const verifyLink = data.verifyLink

  // first name last name
  const nameParts = data.email
    .split('@')[0]
    .replace(/[0-9]/g, '')
    .match(/[A-Z][a-z]+|[0-9]+/g)
    .join(' ')

  const firstName = nameParts.split(' ')[0]
  const lastName = nameParts.split(' ')[1]

  // artist name
  let artistName1, artistName2, artistName3, artistName
  if (getRandom(0, 1) < 1) {
    artistName1 = faker.name.firstName()
  } else {
    artistName1 = uniqueNamesGenerator(config)
  }
  if (getRandom(0, 1) < 1) {
    artistName2 = faker.name.lastName()
  } else {
    artistName2 = uniqueNamesGenerator(config)
  }
  if (getRandom(0, 1) < 1) {
    artistName3 = `${getRandomName(faker.name.firstName(), getRandom(3, 6))}`
  } else {
    artistName3 = `${getRandomName(
      uniqueNamesGenerator(config),
      getRandom(3, 6),
    )}`
  }
  if (getRandom(0, 1) < 1) {
    artistName = `${artistName1} ${artistName2} ${artistName3}`
  } else {
    artistName = `${artistName1} ${artistName3} ${artistName2}`
  }

  // password
  const password = data.password
  // location
  const allLocations = [
    'amsterdam',
    'london',
    'berlin',
    'munich',
    'liverpool',
    'manchester',
    'roma',
    'milan',
    'derby',
    'den haag',
    'rotterdam',
  ]
  // genre
  const allGenres = ['Pop', 'Rock', 'Jazz', 'Dance', 'World']

  const genData = {
    verifyLink,
    firstName,
    lastName,
    artistName,
    email: data.email,
    password,
    location: getRandomFromArr(allLocations, 1)[0],
    genre: getRandomFromArr(allGenres, 1)[0],
  }
  return genData
}
const optimize = async (page) => {
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (req.resourceType() == 'image' || req.resourceType() == 'font') {
      req.abort()
    } else {
      req.continue()
    }
  })

  page.on('dialog', async (dialog) => {
    await dialog.dismiss()
  })
}

// main processes
const handleAutoProcesses = async (datum) => {
  let page
  let genData
  let browser
  let oldProxies
  const maxProxyUsed = 3
  const maxRetryNumber = 10

  try {
    await sleep(getRandom(2000, 4000))
    let shouldCancel = false
    for (let retryNumber = 1; retryNumber <= maxRetryNumber; retryNumber++) {
      if (shouldCancel) {
        throw 'email already register'
        break
      }

      // setup page
      const options = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--incognito',
      ]
      genData = await generateData(datum)

      if (proxies.length > 0) {
        let proxy
        if (retryNumber <= maxProxyUsed) {
          if (!oldProxies) {
            proxy = getRandomFromArr(proxies, 1)[0]
            oldProxies = proxy
          } else {
            proxy = oldProxies
          }
        } else {
          proxy = getRandomFromArr(proxies, 1)[0]
          oldProxies = proxy
        }

        options.push(`--proxy-server=${proxy}`)
        genData.usedProxy = proxy
      }
      console.log('genData detail', genData)

      browser = await puppeteer.launch({
        headless,
        args: options,
      })
      page = (await browser.pages())[0]
      page = puppeteerCloak(page)

      // handle dialog
      await optimize(page)
      await page.setViewport({
        width: 800,
        height: 800,
        deviceScaleFactor: 1,
      })

      // disable cache
      await page.setCacheEnabled(false)

      // create account
      await page.goto(genData.verifyLink)

      try {
        await page.waitForTimeout(getRandom(2000, 4000))

        await page.waitForSelector('input[placeholder=Password]')
        await page.type('input[placeholder=Password]', genData.password, {
          delay: 200,
        })
        await page.click('#terms', {
          delay: 200,
        })
        await page.waitForTimeout(getRandom(2000, 4000))

        page.setCacheEnabled(false)
        await Promise.all([
          page.waitForNavigation({ timeout: getRandom(25000, 35000) }),
          page.click('button[type=submit]', { delay: 0 }),
          page.waitForResponse(async (response) => {
            try {
              if (response.status() === 400) {
                shouldCancel = true
                await page.waitForTimeout(getRandom(2000, 4000))
                await Promise.reject()
                throw 'create account 400'
              }
              if (retryNumber === maxRetryNumber && response.status() === 500) {
                shouldCancel = true
                await page.waitForTimeout(getRandom(2000, 4000))
                await Promise.reject()
                throw 'create account 400'
              }
              if (response.status() === 500) {
                await page.waitForTimeout(getRandom(2000, 4000))
                await Promise.reject()
                throw 'create account 500'
              }
            } catch (e) {
              if (e === 'create account 500') {
                console.log('UM Internal Service Error, trying again...')
              }
              if (e === 'create account 400') {
                console.log('email already register')
              }
            }

            return (
              response
                .url()
                .includes('https://unitedmasters.com/account/accept-invite') &&
              response.status() === 200
            )
          }),
        ])

        break
      } catch (e) {
        // go to this when there is 500
        await page.waitForTimeout(getRandom(2000, 4000))
        page.setCacheEnabled(false)
        await browser.close()
        await sleep(getRandom(2000, 4000))
      }
    }

    // handle info
    await page.waitForTimeout(getRandom(2000, 4000))
    await page.type('input[placeholder="Artist name"]', genData.artistName, {
      delay: 200,
    })
    await page.waitForTimeout(getRandom(2000, 4000))
    await page.type('input[placeholder="First name"]', genData.firstName, {
      delay: 200,
    })
    await page.waitForTimeout(getRandom(2000, 4000))
    await page.type('input[placeholder="Last name"]', genData.lastName, {
      delay: 200,
    })
    await page.waitForTimeout(getRandom(2000, 4000))

    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle location
    await page.waitForTimeout(getRandom(2000, 4000))
    await page.type('input[placeholder=Location]', genData.location, {
      delay: 200,
    })
    await page.waitForTimeout(6000)
    await page.click('._28D4j')
    await page.waitForTimeout(getRandom(2000, 4000))

    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle genre
    await page.waitForTimeout(getRandom(2000, 4000))
    await page.waitForXPath(`//li[contains(., '${genData.genre}')]`)
    const genreButtons = await page.$x(`//li[contains(., '${genData.genre}')]`)
    const correctGenreButton = genreButtons[0]
    await correctGenreButton.click({ delay: 200 })
    await page.waitForTimeout(getRandom(2000, 4000))
    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle know your fan
    await page.waitForTimeout(getRandom(2000, 4000))
    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle choose your deal
    await page.waitForXPath(`//li[contains(., 'No upfront fee')]`)
    const dealButtons = await page.$x(`//li[contains(., 'No upfront fee')]`)
    const correctDealButton = dealButtons[0]

    await page.waitForTimeout(getRandom(2000, 4000))
    await Promise.all([
      page.waitForNavigation(),
      correctDealButton.click({ delay: 200 }),
    ])

    // handle become a um artist
    await page.waitForXPath(`//button[contains(., 'ACCEPT')]`)
    const acceptButtons = await page.$x(`//button[contains(., 'ACCEPT')]`)
    const correctAcceptButton = acceptButtons[0]

    await page.waitForTimeout(getRandom(2000, 4000))
    await Promise.all([
      page.waitForNavigation(),
      correctAcceptButton.click({ delay: 200 }),
    ])

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url() === 'https://unitedmasters.com/api/v1/artists/me' &&
          response.status() === 200,
      ),
      page.waitForResponse(
        (response) =>
          response.url() ===
            'https://unitedmasters.com/me/releases/get-daily-streaming-performance-metrics-by-time-period?day_delta=weekly' &&
          response.status() === 200,
      ),
      page.waitForResponse(
        (response) =>
          response.url() ===
            'https://unitedmasters.com/welcome/complete-welcome-flow' &&
          response.status() === 200,
      ),
      page.waitForResponse(
        (response) =>
          response.url() ===
            'https://unitedmasters.com/artist-session/get-options' &&
          response.status() === 200,
      ),
    ])

    await page.waitForTimeout(getRandom(15000, 30000))

    usedData.push(genData)
    errorData = errorData.filter((da) => da.verifyLink !== genData.verifyLink)

    await page.waitForTimeout(getRandom(2000, 4000))

    if (!devMode) {
      await browser.close()
    }

    // push to usedData and remove from errorData if exist
  } catch (error) {
    // add to error data if not exist
    console.log('*** ERROR FOUND ***')
    if (errorData.every((da) => da.verifyLink !== genData.verifyLink)) {
      errorData.push(genData)
    }
  }
}

const handleSaveReportAndRemove = async () => {
  try {
    await fs.outputJson('./reports/errorData.json', errorData)
    await fs.outputJson('./reports/usedData.json', usedData)

    // remove in data.txt if moved to usedData
    const saveData = data
      .filter((datum) =>
        [...usedData, ...errorData].every(
          (usedDatum) => usedDatum.verifyLink !== datum.verifyLink,
        ),
      )
      .map(
        ({ verifyLink, password, email }) =>
          `${email}:${password}:${verifyLink}`,
      )
      .join('\r\n')
    await fs.writeFile('data.txt', saveData, 'utf8')

    console.log('save report and remove usedData')
  } catch (err) {
    console.error('save report error', err)
  }
}

// enhance handle all
const enhancedHandleAutoProcesses = enhance(
  'handle one auto process',
  handleAutoProcesses,
)

// GIVE ME ATTENTION PLSS
;(async () => {
  startNoti()
  await checkSettings()
  console.log('-----HANDLE FRESH DATA START-----')
  try {
    for (const datum of data) {
      await enhancedHandleAutoProcesses(datum)
      await handleSaveReportAndRemove()
    }
  } catch (error) {
    console.log('HANDLE FRESH DATA ERROR: ', error)
  }
  console.log('-----HANDLE FRESH DATA END-----')
  endNoti()
})()
