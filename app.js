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

// // report json
// const defaultErrorData = require('./reports/errorData.json')
// const defaultUsedData = require('./reports/usedData.json')

// // app states
// let usedData = [...defaultUsedData]
// let errorData = [...defaultErrorData]

// support functions
function checkForDuplicates(array) {
  return new Set(array).size !== array.length
}
const checkSettings = async () => {
  // // no account
  // if (rawAccounts.length === 0) {
  //   console.log('***SETTINGS ERROR: NO ACCOUNTS***')
  //   throw 'no accounts in accounts.txt'
  // }

  // // check supported genres folder exist
  // const allGenreFolders = await fs.readdir(`./genres`)
  // if (supportedGenres.some((genre) => !allGenreFolders.includes(genre))) {
  //   console.log('***SETTINGS ERROR: ENSURE SUPPORTED GENRES FOLDER EXIST***')
  //   throw 'no genres folder'
  // }

  // // check supported genres trackNames
  // if (supportedGenres.some((genre) => !trackNames.hasOwnProperty(genre))) {
  //   console.log(
  //     '***SETTINGS ERROR: ENSURE SUPPORTED GENRES IN SETTINGS TRACKNAMES***',
  //   )
  //   throw 'no genres folder'
  // }

  // // check supported genres releaseNames
  // if (supportedGenres.some((genre) => !releaseNames.hasOwnProperty(genre))) {
  //   console.log(
  //     '***SETTINGS ERROR: ENSURE SUPPORTED GENRES IN SETTINGS RELEASENAMES***',
  //   )
  //   throw 'ensure supported genres in releaseNames'
  // }

  // // check useVCC
  // if (useVCC && rawVccs.length === 0) {
  //   console.log('***SETTINGS ERROR: NO VCC***')
  //   throw 'no vcc in vcc.txt'
  // }

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

const getUnusedTracks = async (genre, noOfWantedTracks) => {
  const allTracks = await fs.readdir(`./genres/${genre}`)
  const avoidTracks = [...usedData, ...errorData]
    .filter((da) => da.genre === genre)
    .map((da) => da.tracks)
    .flat()
  // console.log('watch me avoidTracks', avoidTracks)
  const cleanTracks = allTracks.filter(
    (track) => !avoidTracks.some((avoidTrack) => avoidTrack.includes(track)),
  )
  // console.log('watch me cleanTracks', cleanTracks)
  // handle error here
  // transform
  const tracks = getRandomFromArr(cleanTracks, noOfWantedTracks).map(
    (track) => `genres/${genre}/${track}`,
  )
  // console.log('watch me tracks', tracks)
  return tracks
}
const getUnusedArt = async () => {
  // only get unused art
  const allArts = await fs.readdir(`./arts`)
  const avoidArts = [...usedData, ...errorData].map((da) => da.art)
  const cleanArts = allArts.filter(
    (art) => !avoidArts.some((avoidArt) => avoidArt.includes(art)),
  )
  // handle error here
  const arts = getRandomFromArr(cleanArts, 1)
  // transform
  const art = arts.map((tempArt) => `arts/${tempArt}`)[0]
  return art
}
const getUnunsedReleaseName = (genre) => {
  // random release name
  const allReleaseNames = releaseNames[genre]
  const avoidReleaseNames = [...usedData, ...errorData]
    .filter((da) => da.genre === genre)
    .map((da) => da.releaseName)

  const cleanReleaseNames = allReleaseNames.filter(
    (releaseName) =>
      !avoidReleaseNames.some((avoidReleaseName) =>
        avoidReleaseName.includes(releaseName),
      ),
  )
  let releaseName = ''
  if (cleanReleaseNames.length < 1) {
    releaseName = `${faker.address.streetName()} ${getRandomName(
      faker.address.streetName(),
      getRandom(3, 6),
    )}`
  } else {
    releaseName = getRandomFromArr(cleanReleaseNames, 1)[0]
  }
  // WE CAN IMPROVE HERE
  let improvedReleaseName = releaseName
  return improvedReleaseName
}
const getUnusedSongWriter = () => {
  //random song writer name
  const allSongWriterNames = [...songWriterNames]
  const avoidSongWriterNames = [...usedData, ...errorData].map(
    (da) => da.songWriterName,
  )
  const cleanSongWriterNames = allSongWriterNames.filter(
    (songWriterName) =>
      !avoidSongWriterNames.some((avoidSongWriterName) =>
        avoidSongWriterName.includes(songWriterNames),
      ),
  )

  let songWriterName = ''
  if (cleanSongWriterNames.length < 1) {
    songWriterName = `${faker.name.firstName()} ${faker.name.lastName()} ${getRandomName(
      faker.name.findName(),
      getRandom(3, 6),
    )}`
  } else {
    songWriterName = getRandomFromArr(cleanSongWriterNames, 1)[0]
  }

  return songWriterName
}

const getUnusedVCC = () => {
  //random vcc
  const allVccs = [...vccs]
  const avoidVccs = [...usedData, ...errorData].map((da) => da.vcc)
  const cleanVccs = allVccs.filter(
    (vcc) =>
      !avoidVccs.some((avoidVcc) => {
        if (!avoidVcc) {
          return false
        }
        if (avoidVcc && vcc) {
          return avoidVcc.cardNumber === vcc.cardNumber
        }
        return false
      }),
  )
  let vcc = null
  if (cleanVccs.length < 1) {
    throw 'no vcc left'
  } else {
    vcc = getRandomFromArr(cleanVccs, 1)[0]
  }
  return vcc
}

const getUnusedTrackNames = (genre, noOfWantedTracks) => {
  // only get unsed trackNames
  const allTrackNames = trackNames[genre]
  const avoidTrackNames = [...usedData, ...errorData]
    .filter((da) => da.genre === genre)
    .map((da) => da.trackNames)
    .flat()

  const cleanTrackNames = allTrackNames.filter(
    (trackName) =>
      !avoidTrackNames.some((avoidTrackName) =>
        avoidTrackName.includes(trackName),
      ),
  )

  let trackNamesToUse = []
  if (cleanTrackNames.length < noOfWantedTracks) {
    trackNamesToUse = [...cleanTrackNames]
    while (trackNamesToUse.length < noOfWantedTracks) {
      trackNamesToUse.push(
        `${faker.address.streetName()} ${getRandomName(
          faker.address.streetName(),
          getRandom(3, 6),
        )}`,
      )
    }
  } else {
    trackNamesToUse = getRandomFromArr(cleanTrackNames, noOfWantedTracks)
  }
  // WE CAN IMPROVE HERE
  let improvedTrackNames = trackNamesToUse
  return improvedTrackNames
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

  // genre

  const genData = {
    verifyLink,
    firstName,
    lastName,
    artistName,
    password,
    location: 'london',
    genre: 'Pop',
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
const createRelease = async (page) => {
  try {
    // go to /upload
    await page.waitForTimeout(3000)
    await page.goto('https://unitedmasters.com/uploads', {
      waitUntil: 'domcontentloaded',
    })
    // click create release
    await page.waitForXPath("//p[contains(., 'Spotify')]", { visible: true })
    const spotifyButtons = await page.$x("//p[contains(., 'Spotify')]")
    const correctSpotifyButton = spotifyButtons[0]
    await Promise.all([
      page.waitForNavigation(),
      correctSpotifyButton.click({ delay: 200 }),
    ])
  } catch (error) {
    console.log('create release error', error)
  }
}
const uploadFiles = async (
  page,
  files,
  confirmRes,
  timeout = 1200000,
  selectorString = "//a[contains(., 'browse your')]",
  numberOfRequest = 1,
) => {
  try {
    // click upload input
    await page.waitForXPath(selectorString, {
      visible: true,
    })
    const inputUploadHandles = await page.$x(selectorString)
    const inputUploadHandle = inputUploadHandles[0]

    // upload files
    const [fileChooser] = await Promise.all([
      page.waitForFileChooser(),
      inputUploadHandle.click({ delay: 200 }),
    ])

    console.log('uploading files')
    await fileChooser.accept(files)

    await page.waitForTimeout(2000)
    let uploadConfirm
    if (numberOfRequest > 1) {
      let counter = 0
      uploadConfirm = await page.waitForResponse(
        (response) => {
          if (response.url() === confirmRes) {
            counter++
          }
          return counter === numberOfRequest
        },
        { timeout },
      )
    } else {
      uploadConfirm = await page.waitForResponse(
        (response) => {
          return response.url() === confirmRes
        },
        { timeout },
      )
    }

    console.log('upload files succeed:', uploadConfirm.ok())
  } catch (error) {
    console.log('upload files error', error)
    throw 'upload files error'
  }
}
const handleLowQualitySongs = async (page) => {
  try {
    await page.waitForXPath("//button[contains(., 'I understand')]", {
      visible: true,
      timeout: 5000,
    })

    const lowQualiTySongButtons = await page.$x(
      "//button[contains(., 'I understand')]",
    )
    const lowQualiTySongButton = lowQualiTySongButtons[0]
    if (lowQualiTySongButton) {
      console.log('handle low quality songs')
      await Promise.all([lowQualiTySongButton.click({ delay: 200 })])
    }
  } catch (error) {
    console.log('no low quality')
  }
}
const handleConnectionLost = async (page, tracks) => {
  await page.waitForTimeout(3000)
  try {
    await page.waitForXPath("//div[contains(., 'Okay, got it')]", {
      visible: true,
      timeout: 10000,
    })

    const gotItButtons = await page.$x("//div[contains(., 'Okay, got it')]")
    const gotItButton = gotItButtons[0]
    if (gotItButton) {
      console.log('handle connect lost')
      throw 'connection lost'

      // IMPROVE HANDLE CONNECTION LOSE HERE (NOT WORKING, NEED FIX)
      // await Promise.all([
      //   gotItButton.click({ delay: 200 }),
      //   page.waitForNavigation(),
      // ])

      // const removesButtons = await page.$x(
      //   '//*[name()="svg"]//*[local-name()="path" and @d="M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"]',
      // )

      // for (let i = 0; i < removesButtons.length; i++) {
      //   if (removesButtons[i].isIntersectingViewport()) {
      //     await removesButtons[i].click({ delay: 200 })
      //     await page.waitForTimeout(1000)
      //   }
      // }

      // await uploadFiles(
      //   page,
      //   tracks,
      //   'https://unitedmasters.com/studio/create-track',
      // )
      // await handleLowQualitySongs(page)
    }
  } catch (error) {
    if (error === 'connection lost') {
      // throw to outer try catch (to stop program)
      throw 'connection lost'
    } else {
      console.log('no connect lost')
    }
  }
}
const handleNext = async (page, correctIndex) => {
  await page.waitForTimeout(3000)
  try {
    await page.waitForXPath("//button[contains(., 'Next')]")
    const nextButtons = await page.$x("//button[contains(., 'Next')]")
    const correctNextButton = nextButtons[correctIndex]
    await Promise.all([
      page.waitForNavigation(),
      correctNextButton.click({ delay: 200 }),
    ])
    await page.waitForTimeout(3000)
  } catch (error) {
    console.log('handle next 1 error', error)
    throw '500 Internal Service Error'
  }
}
const handleSaveReportAndRemove = async () => {
  try {
    await fs.outputJson('./reports/errorData.json', errorData)
    await fs.outputJson('./reports/usedData.json', usedData)

    // remove art and tracks
    for (const datum of usedData) {
      await fs.remove(datum.art)
      for (const track of datum.tracks) {
        await fs.remove(track)
      }
    }

    // remove in accounts.txt if moved to usedData
    const saveAccounts = accounts
      .filter((account) =>
        usedData.every((datum) => datum.account.email !== account.email),
      )
      .map(({ email, password, genre, songWriterName }) => {
        let result = `${email}:${password}`
        if (genre) {
          result += `:${genre}`
        }
        if (songWriterName) {
          result += `:${songWriterName}`
        }
        return result
      })
      .join('\r\n')
    await fs.writeFile('accounts.txt', saveAccounts, 'utf8')

    // remove in songWriterNames.txt if moved to usedData
    const saveSongWriterNames = songWriterNames
      .filter((songWriterName) =>
        usedData.every((datum) => datum.songWriterName !== songWriterName),
      )
      .join('\r\n')
    await fs.writeFile('songWriterNames.txt', saveSongWriterNames, 'utf8')

    // remove in vcc.txt if moved to usedData
    const saveVccs = vccs
      .filter((vcc) =>
        usedData.every((datum) => {
          if (!datum.vcc) {
            return false
          }
          if (datum && vcc) {
            return datum.cardNumber === vcc.cardNumber
          }
          return false
        }),
      )
      .map(({ cardNumber, expiry, cvc, cardName }) => {
        return `${cardNumber}:${expiry}:${cvc}:${cardName}`
      })
      .join('\r\n')
    await fs.writeFile('vcc.txt', saveVccs, 'utf8')

    console.log('save report and remove usedData')
  } catch (err) {
    console.error('save report error', error)
  }
}

// main processes

// enhanced processes

const handleAutoProcesses = async (page, data) => {
  try {
    console.log('watch me start process')

    // login
    await page.goto(data.verifyLink, {})
    await page.waitForTimeout(3000)
    await page.waitForSelector('input[placeholder=Password]')
    await page.type('input[placeholder=Password]', data.password, {
      delay: 200,
    })
    await page.click('#terms', {
      delay: 200,
    })

    await page.waitForTimeout(3000)
    await page.reload()

    const maxRetryNumber = 100
    for (let retryNumber = 1; retryNumber <= maxRetryNumber; retryNumber++) {
      try {
        await page.waitForTimeout(3000)
        await page.waitForSelector('input[placeholder=Password]')
        await page.type('input[placeholder=Password]', data.password, {
          delay: 200,
        })
        await page.click('#terms', {
          delay: 200,
        })
        await page.waitForTimeout(3000)
        page.setCacheEnabled(false)
        await Promise.all([
          page.waitForNavigation({ timeout: 30000 }),
          page.click('button[type=submit]', { delay: 500 }),
          page.waitForResponse(
            (response) =>
              response
                .url()
                .includes('https://unitedmasters.com/account/accept-invite') &&
              response.status() === 200,
          ),
        ])

        break
      } catch (e) {
        await page.waitForTimeout(3000)
        page.setCacheEnabled(false)
        await page.reload()
      }
    }

    // handle info
    await page.waitForTimeout(3000)
    await page.type('input[placeholder="Artist name"]', data.artistName, {
      delay: 200,
    })
    await page.type('input[placeholder="First name"]', data.firstName, {
      delay: 200,
    })
    await page.type('input[placeholder="Last name"]', data.lastName, {
      delay: 200,
    })
    await page.waitForTimeout(3000)

    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle location
    await page.waitForTimeout(3000)
    await page.type('input[placeholder=Location]', data.location, {
      delay: 200,
    })
    await page.waitForTimeout(6000)
    await page.click('._28D4j')
    await page.waitForTimeout(3000)

    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle genre
    await page.waitForTimeout(3000)
    await page.waitForXPath(`//li[contains(., '${data.genre}')]`)
    const genreButtons = await page.$x(`//li[contains(., '${data.genre}')]`)
    const correctGenreButton = genreButtons[0]
    await correctGenreButton.click({ delay: 200 })
    await page.waitForTimeout(3000)
    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle know your fan
    await page.waitForTimeout(3000)
    await Promise.all([page.waitForNavigation(), page.click('._143KU')])

    // handle choose your deal
    await page.waitForXPath(`//li[contains(., 'No upfront fee')]`)
    const dealButtons = await page.$x(`//li[contains(., 'No upfront fee')]`)
    const correctDealButton = dealButtons[0]

    await page.waitForTimeout(3000)
    await Promise.all([
      page.waitForNavigation(),
      correctDealButton.click({ delay: 200 }),
    ])

    // handle become a um artist
    await page.waitForXPath(`//button[contains(., 'ACCEPT')]`)
    const acceptButtons = await page.$x(`//button[contains(., 'ACCEPT')]`)
    const correctAcceptButton = acceptButtons[0]

    await page.waitForTimeout(3000)
    await Promise.all([
      page.waitForNavigation(),
      correctAcceptButton.click({ delay: 200 }),
    ])

    // push to usedData and remove from errorData if exist
    // usedData.push(data)
    // errorData = errorData.filter(
    //   (da) => da.account.email !== data.account.email,
    // )
  } catch (error) {
    // add to error data if not exist
    console.log('*** ERROR FOUND ***', error)
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
      const genData = await generateData(datum)

      if (proxies.length > 0) {
        const proxy = getRandomFromArr(proxies, 1)[0]
        // const proxy = '84.21.191.196:80'
        options.push(`--proxy-server=${proxy}`)
        genData.usedProxy = proxy
      }
      console.log('watch me genData', genData)

      const browser = await puppeteer.launch({
        headless,
        args: options,
      })
      const page = (await browser.pages())[0]
      const cloakedPage = puppeteerCloak(page)

      // handle dialog
      await optimize(page)
      await page.setViewport({
        width: 800,
        height: 800,
        deviceScaleFactor: 1,
      })

      // disable cache
      await page.setCacheEnabled(false)

      await enhancedHandleAutoProcesses(page, genData)
      // await handleSaveReportAndRemove()
      if (!devMode) {
        await browser.close()
      }
      await sleep(1500)
    }
  } catch (error) {
    console.log('HANDLE FRESH DATA ERROR: ', error)
  }
  console.log('-----HANDLE FRESH DATA END-----')
  endNoti()
})()
