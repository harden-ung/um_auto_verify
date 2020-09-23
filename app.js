const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
const puppeteerCloak = require('puppeteer-cloak')

const faker = require('faker')
const figlet = require('figlet')
const chalk = require('chalk')

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

const fs = require('fs-extra')

// settings
const {
  headless,
  minTracks,
  maxTracks,
  trackNames,
  releaseNames,
  forcedGenre,
  supportedGenres,
  useVCC,
  devMode,
} = require('./settings.json')

// import accounts
const rawAccounts = fs
  .readFileSync('./accounts.txt')
  .toString()
  .split('\r\n')
  .filter((rawAccount) => rawAccount !== '')

const accounts = rawAccounts
  .map((account) => {
    const [email, password, genre, songWriterName] = account.split(':')
    return { email, password, genre, songWriterName }
  })
  .filter((account) => account.email !== '')
const rawVccs = fs
  .readFileSync('./vcc.txt')
  .toString()
  .split('\r\n')
  .filter((rawVcc) => rawVcc != '')

const vccs = rawVccs.map((vcc) => {
  const [cardNumber, expiry, cvc, cardName] = vcc.split(':')
  return { cardNumber, expiry, cvc, cardName }
})

const songWriterNames = fs
  .readFileSync('./songWriterNames.txt')
  .toString()
  .split('\r\n')
  .filter((name) => name != '')
const proxies = fs
  .readFileSync('./proxies.txt')
  .toString()
  .split('\r\n')
  .filter((proxy) => proxy !== '')

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

const generateData = async (account) => {
  const noOfWantedTracks = getRandom(minTracks, maxTracks)

  let genre

  if (account.genre) {
    genre = account.genre
  } else {
    genre = supportedGenres.includes(forcedGenre)
      ? forcedGenre
      : supportedGenres[getRandom(0, supportedGenres.length - 1)]
  }

  const tracks = await getUnusedTracks(genre, noOfWantedTracks)
  const art = await getUnusedArt()
  const releaseName = getUnunsedReleaseName(genre)

  let songWriterName
  if (account.songWriterName) {
    songWriterName = account.songWriterName
  } else {
    songWriterName = getUnusedSongWriter()
  }

  const trackNames = getUnusedTrackNames(genre, noOfWantedTracks)

  let vcc = null
  if (useVCC) {
    vcc = await getUnusedVCC()
  }

  const data = {
    account,
    genre,
    tracks,
    trackNames,
    songWriterName,
    releaseName,
    art,
    vcc,
  }
  return data
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
    await page.waitFor(3000)
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

    await page.waitFor(2000)
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
  await page.waitFor(3000)
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
      //     await page.waitFor(1000)
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
  await page.waitFor(3000)
  try {
    await page.waitForXPath("//button[contains(., 'Next')]")
    const nextButtons = await page.$x("//button[contains(., 'Next')]")
    const correctNextButton = nextButtons[correctIndex]
    await Promise.all([
      page.waitForNavigation(),
      correctNextButton.click({ delay: 200 }),
    ])
    await page.waitFor(3000)
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
const handleLogin = async (page, email, password) => {
  await page.goto('https://unitedmasters.com/account/login', {
    waitUntil: 'domcontentloaded',
  })

  await page.waitForSelector('input[placeholder=Email')
  await page.type('input[placeholder=Email]', email, {
    delay: 100,
  })

  await page.waitForSelector('input[placeholder=Password]')
  await page.type('input[placeholder=Password]', password, {
    delay: 100,
  })

  const [response] = await Promise.all([
    page.waitForNavigation({ timeout: 30000 }),
    page.click('button[type=submit]', { delay: 500 }),
    page.waitForResponse(
      (response) =>
        response
          .url()
          .includes(
            'https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPasswor',
          ) && response.status() === 200,
    ),
  ])
}

const handleVcc = async (page, vcc) => {
  const { cardNumber, cardName, expiry, cvc } = vcc
  await page.waitFor(2000)
  await page.goto('https://unitedmasters.com/membership', {
    waitUntil: 'load',
  })

  await page.waitForXPath("//button[contains(., 'Start free 14-day trial')]")
  const freeTrialButtons = await page.$x(
    "//button[contains(., 'Start free 14-day trial')]",
  )
  const correctFreeTrialButton = freeTrialButtons[0]

  await Promise.all([
    page.waitForNavigation(),
    correctFreeTrialButton.click({ delay: 200 }),
  ])
  await page.waitFor(2000)

  await page.waitForSelector('input[id=cardNumber]')
  await page.type('input[id=cardNumber]', cardNumber, {
    delay: 100,
  })

  await page.waitForSelector('input[id=cardExpiry]')
  await page.type('input[id=cardExpiry]', expiry, {
    delay: 100,
  })

  await page.waitForSelector('input[id=cardCvc]')
  await page.type('input[id=cardCvc]', cvc, {
    delay: 100,
  })

  await page.waitForSelector('input[id=billingName]')
  await page.type('input[id=billingName]', cardName, {
    delay: 100,
  })

  const blackListcountrySelectValues = ['GB', 'US']
  const ramdomCountriesToSelect = ['KH', 'FI', 'NL', 'NO', 'IT', 'DE']

  const countrySelectValue = await page.$eval(
    'select[id=billingCountry]',
    (el) => el.value,
  )

  if (blackListcountrySelectValues.includes(countrySelectValue)) {
    const newSelectedCountry = getRandomFromArr(ramdomCountriesToSelect, 1)[0]
    await page.select('select[id=billingCountry]', newSelectedCountry)
  }

  await page.waitForXPath("//span[contains(., 'Start trial')]")
  const startFreeTrialButtons = await page.$x(
    "//span[contains(., 'Start trial')]",
  )
  const correctStartFreeTrialButton = startFreeTrialButtons[0]

  await Promise.all([
    page.waitForNavigation(),
    correctStartFreeTrialButton.click({ delay: 200 }),
  ])
}

const handleAddTracks = async (page, tracks) => {
  await createRelease(page)
  await uploadFiles(
    page,
    tracks,
    'https://unitedmasters.com/studio/create-track',
    1200000,
    "//a[contains(., 'browse your')]",
    tracks.length,
  )

  await handleLowQualitySongs(page)
  await handleConnectionLost(page, tracks)
  await handleNext(page, 1)
}
const handleArtwork = async (page, art) => {
  await page.reload()

  await page.waitForXPath("//h2[contains(., 'Add Album Art')]", {
    timeout: 60000,
  })
  //handle upload art
  await uploadFiles(
    page,
    [art],
    'https://unitedmasters.com/studio/create-asset',
    300000,
  )
  await handleNext(page, 1)
}
const handleDetails = async (
  page,
  releaseName,
  genre,
  songWriter,
  trackNames,
) => {
  // handle release title
  await page.waitForSelector('input[placeholder*="Enter release title"]')
  const releaseTitleInput = await page.$(
    'input[placeholder*="Enter release title"]',
  )
  await releaseTitleInput.type(releaseName, { delay: 100 })

  // handle genre
  await page.waitForXPath('//label[contains(., "Genre")]/select')
  let genreButtons = await page.$x('//label[contains(., "Genre")]/select')
  await genreButtons[0].select(genre)

  // handle track name
  await page.waitForSelector('input[placeholder*="Add title for"]')
  const trackNameInputs = await page.$$('input[placeholder*="Add title for"]')

  for (let i = 0; i < trackNameInputs.length; i++) {
    await trackNameInputs[i].type(trackNames[i], { delay: 100 })
  }

  // handle song writer name
  await page.waitForSelector('input[placeholder*="Enter Legal Nam"]')
  let songWritterInputs = await page.$$('input[placeholder*="Enter Legal Nam"]')

  let tempMax = songWritterInputs.length

  for (let i = 0; i < tempMax; i++) {
    await page.waitForSelector('input[placeholder*="Enter Legal Nam"]')
    let songWritterInputs = await page.$$(
      'input[placeholder*="Enter Legal Nam"]',
    )
    await songWritterInputs[i].type(songWriter, { delay: 100 })
  }

  // handle explicit content

  await page.waitForXPath(
    '//label[contains(., "Explicit Content")]/div/div[contains(@class,"Select-control")]',
    { visible: true },
  )
  let explicitContents = await page.$x(
    '//label[contains(., "Explicit Content")]/div/div[contains(@class,"Select-control")]',
  )
  for (const explicitContent of explicitContents) {
    await explicitContent.click({ delay: 200 })

    await page.waitForXPath(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"This track contains no explicit language or themes.")]',
      { visible: true },
    )
    let notExplicitButtons = await page.$x(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"This track contains no explicit language or themes.")]',
    )
    await notExplicitButtons[0].click({ delay: 200 })
  }

  // handle radio edit

  await page.waitForXPath(
    '//label[contains(., "Is this a radio edit?")]/div/div[contains(@class,"Select-control")]',
    { visible: true },
  )
  let radioEdits = await page.$x(
    '//label[contains(., "Is this a radio edit?")]/div/div[contains(@class,"Select-control")]',
  )
  for (const radioEdit of radioEdits) {
    await radioEdit.click({ delay: 200 })

    await page.waitForXPath(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"This song is clean and always has been.")]',
      { visible: true },
    )
    let noButtons = await page.$x(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"This song is clean and always has been.")]',
    )
    await noButtons[0].click({ delay: 200 })
  }

  // handle intrumental content
  await page.waitForXPath(
    '//label[contains(., "Instrumental")]/div/div[contains(@class,"Select-control")]',
    { visible: true },
  )
  let intrumentals = await page.$x(
    '//label[contains(., "Instrumental")]/div/div[contains(@class,"Select-control")]',
  )
  for (const intrumental of intrumentals) {
    await intrumental.click({ delay: 200 })

    await page.waitForXPath(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"Yes, this track is an instrumental")]',
      { visible: true },
    )
    let yesIntrumentals = await page.$x(
      '//div[contains(@class, "Select-menu-outer")]/div/div/div[contains(.,"Yes, this track is an instrumental")]',
    )
    await yesIntrumentals[0].click({ delay: 200 })
  }

  // handle next
  await handleNext(page, 0)
}
const handleReleaseDate = async (page) => {
  await handleNext(page, 0)
}
const handleSubmit = async (page) => {
  await page.click('#original', { delay: 200 })
  await page.click('#toc', { delay: 200 })
  await page.waitFor(3000)
  await page.waitForXPath("//button[contains(., 'Submit')]")
  const submitButtons = await page.$x("//button[contains(., 'Submit')]")
  const correctSubmitButton = submitButtons[0]
  await Promise.all([
    page.waitForNavigation(),
    correctSubmitButton.click({ delay: 200 }),
  ])
  await page.waitFor(3000)
}

// enhanced processes
const enhancedLogin = enhance('handle login', handleLogin)
const enhandedHandleVcc = enhance('handle Vcc', handleVcc)
const enhancedHandleAddTracks = enhance('handle add tracks', handleAddTracks)
const enhancedHandleArtwork = enhance('handle artwork', handleArtwork)
const enhancedHandleDetails = enhance('handle details', handleDetails)
const enhancedHandleReleaseDate = enhance(
  'handle release date',
  handleReleaseDate,
)
const enhancedHandleSubmit = enhance('handle submit', handleSubmit)

const handleAutoProcesses = async (page, data) => {
  try {
    await enhancedLogin(page, data.account.email, data.account.password)
    if (useVCC) {
      await enhandedHandleVcc(page, data.vcc)
    }
    await enhancedHandleAddTracks(page, data.tracks)
    await enhancedHandleArtwork(page, data.art)
    await enhancedHandleDetails(
      page,
      data.releaseName,
      data.genre,
      data.songWriterName,
      data.trackNames,
    )
    await enhancedHandleReleaseDate(page)
    await enhancedHandleSubmit(page)
    // push to usedData and remove from errorData if exist
    usedData.push(data)
    errorData = errorData.filter(
      (da) => da.account.email !== data.account.email,
    )
  } catch (error) {
    // add to error data if not exist
    console.log('*** ERROR FOUND ***')
    if (errorData.every((da) => da.account.email !== data.account.email)) {
      errorData.push(data)
    }
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
    for (const account of accounts) {
      const isAccountUsed = [...usedData, ...errorData].some(
        (da) => da.account.email === account.email,
      )
      if (!isAccountUsed) {
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

        const data = await generateData(account)

        if (proxies.length > 0) {
          const proxy = getRandomFromArr(proxies, 1)[0]
          options.push(`--proxy-server=${proxy}`)
          data.usedProxy = proxy
        }

        const browser = await puppeteer.launch({
          headless,
          args: options,
        })
        const page = (await browser.pages())[0]
        const cloakedPage = puppeteerCloak(page)

        // block images and fonts
        await optimize(page)
        await page.setViewport({
          width: 800,
          height: 600,
          deviceScaleFactor: 1,
        })

        await enhancedHandleAutoProcesses(page, data)
        await handleSaveReportAndRemove()
        if (!devMode) {
          await browser.close()
        }
        await sleep(1500)
      }
    }
  } catch (error) {
    console.log('HANDLE FRESH DATA ERROR: ', error)
  }
  console.log('-----HANDLE FRESH DATA END-----')
  endNoti()
})()
