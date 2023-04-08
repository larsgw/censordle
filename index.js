(function () {
  const freeTokens = new Set([
    // articles
    'a',
    'an',
    'the',

    // ?
    'and',
    'or',

    // pronouns
    'it',
    'where',

    // verbs
    'is',
    'was',

    // prepositions
    'after',
    'against',
    'as',
    'at',
    'before',
    'behind',
    'between',
    'by',
    'despite',
    'during',
    'for',
    'from',
    'in',
    'inside',
    'of',
    'on',
    'outside',
    'past',
    'to',
    'until',
    'up',
    'with',
  ])
  const excludedContent = [
    // Added
    'style',
    'script',
    '.mw-ref',
    'figure',
    // Original
    '[rel="mw-deduplicated-inline-style"]',
    '[title="Name at birth"]',
    '[aria-labelledby="micro-periodic-table-title"]',
    '.barbox',
    '.wikitable',
    '.clade',
    '.Expand_section',
    '.nowrap',
    '.IPA',
    '.thumb',
    '.mw-empty-elt',
    '.mw-editsection',
    '.nounderlines',
    '.nomobile',
    '.searchaux',
    '#toc',
    '.sidebar',
    '.sistersitebox',
    '.noexcerpt',
    '.hatnote',
    '.haudio',
    '.portalbox',
    '.mw-references-wrap',
    '.infobox',
    '.unsolved',
    '.navbox',
    '.metadata',
    '.refbegin',
    '.reflist',
    '.mw-stack',
    '.reference',
    '.quotebox',
    '.collapsible',
    '.uncollapsed',
    '.mw-collapsible',
    '.mw-made-collapsible',
    '.mbox-small',
    '.mbox',
    '#coordinates',
    '.succession-box',
    '.noprint',
    '.mwe-math-element',
    '.cs1-ws-icon'
  ].join(', ')

  const excludedSections = [
    // Original
    'External_links',
    'Further_reading',
    'Notes',
    'References',
    // Added
    'Bibliography'
  ]

  function tokenize (text) {
    return text.split(/((?:\p{L}|\p{M}|\p{N})+)/gu)
  }

  function normalizeToken (token) {
    return token.replace(/[^\p{L}\p{M}\p{N}]/gu, '').normalize('NFD').toLowerCase()
  }

  const titleTokens = new Set()
  const tokens = []
  const tokensReverse = {}
  function registerToken (token) {
    const cleanToken = normalizeToken(token)
    if (cleanToken in tokensReverse) {
      tokens[tokensReverse[cleanToken]].push(token)
    } else {
      tokensReverse[cleanToken] = tokens.length
      tokens.push([token])
    }
    return tokensReverse[cleanToken]
  }

  function censor (text) {
    return tokenize(text).map((fragment, i) => {
      if (i % 2 && !freeTokens.has(normalizeToken(fragment))) {
        const id = registerToken(fragment)
        const $span = document.createElement('span')
        $span.dataset.token = id
        $span.textContent = '█'.repeat([...fragment].length)
        return $span
      } else {
        return fragment
      }
    })
  }

  const guesses = new Set()
  function reveal (token, fromState) {
    const cleanToken = normalizeToken(token)
    if (cleanToken.length === 0) {
      const $previous = document.querySelector('#article [data-scroll="true"]')
      if ($previous) {
        scroll($previous.dataset.token)
      }
      return
    }

    const id = tokensReverse[cleanToken]
    let matches = []
    if (cleanToken in tokensReverse) {
      matches = document.querySelectorAll(`#article [data-token="${id}"]`)
    }

    if (!guesses.has(cleanToken) && !freeTokens.has(cleanToken)) {
      guesses.add(cleanToken)

      // Record guess if the article is not yet solved, and
      // we are not loading from the saved state.
      if (titleTokens.size !== 0 && !fromState) {
        localData.current.guesses.push(cleanToken)
      }

      const $tbody = document.querySelector('#guesses tbody')

      const $td0 = document.createElement('td')
      // Do not count guesses after article is solved
      if (titleTokens.size !== 0) {
        $td0.textContent = $tbody.children.length + 1
      }
      const $td1 = document.createElement('td')
      $td1.textContent = cleanToken
      const $td2 = document.createElement('td')
      $td2.textContent = matches.length

      const $tr = document.createElement('tr')
      $tr.dataset.token = id
      $tr.addEventListener('click', function () {
        if (!this.classList.contains('highlight')) {
          highlight(this.dataset.token)
        }
        scroll(this.dataset.token)
      })
      $tr.append($td0, $td1, $td2)
      $tbody.prepend($tr)

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i]
        match.textContent = tokens[id][i]
      }

      titleTokens.delete(cleanToken)
      if (titleTokens.size === 0) {
        const indices = {}
        for (const $span of document.querySelectorAll('#article [data-token]')) {
          const id = $span.dataset.token
          indices[id] = indices[id] || 0
          $span.textContent = tokens[id][indices[id]]
          indices[id]++
        }
        // Record win
        if (!fromState) {
          localData.stats[currentDay] = guesses.size
        }
        updateStats()
        document.getElementById('stats').show()
      }
    }

    highlight(id)
    if (!fromState) scroll(id)
    save()
  }

  function highlight (id) {
    if (id === undefined || id === 'undefined') {
      return
    }

    for (const $token of document.querySelectorAll('#guesses tbody tr, #article [data-token]')) {
      if ($token.dataset.token.toString() === id.toString()) {
        $token.classList.add('highlight')
      } else {
        $token.classList.remove('highlight')
      }
    }
  }

  function scroll (id) {
    if (id === undefined || id === 'undefined') {
      return
    }

    for (const $token of document.querySelectorAll(`#article [data-scroll="true"]`)) {
      if ($token.dataset.token !== id.toString()) {
        delete $token.dataset.scroll
      }
    }

    const $tokens = [...document.querySelectorAll(`#article [data-token="${id}"]`)]
    let scrollTo = 0
    for (const $token of $tokens) {
      if ($token.dataset.scroll) {
        delete $token.dataset.scroll
        scrollTo = $tokens.indexOf($token) + 1
      }
    }

    $tokens[scrollTo % $tokens.length].dataset.scroll = 'true'
    $tokens[scrollTo % $tokens.length].scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
//     setTimeout(function () {
//       document.querySelector(`#guesses tbody tr[data-token="${id}"]`).scrollIntoView({
//         behavior: 'smooth',
//         block: 'center'
//       })
//     }, 0)
  }

  // Load data
  function cleanHtml (element) {
    const children = []
    for (const child of element.childNodes) {
      if (child instanceof Element) {
        if (child.matches('i, p, ul, ol, li, h2, h3, h4, h5, h6')) {
          cleanHtml(child)
          children.push(child)
        } else if (!child.matches(excludedContent)) {
          cleanHtml(child)
          children.push(...child.childNodes)
        }
      } else {
        children.push(...censor(child.textContent))
      }
    }
    element.replaceChildren(...children)
  }

  function formatSection (content) {
    const parser = new DOMParser()
    const doc = document.implementation.createHTMLDocument('section')
    const $section = doc.createElement('section')
    $section.innerHTML = content.text

    if (content.line) {
      const $heading = doc.createElement('h' + (content.toclevel + 2))
      $heading.innerHTML = content.line
      $section.prepend($heading)
    }

    cleanHtml($section)

    return $section
  }

  async function getPage (id) {
    const request = await fetch(`https://en.wikipedia.org/api/rest_v1/page/mobile-sections/${id}`)
    const data = await request.json()

    const title = data.lead.normalizedtitle.replace(/ \(.+?\)$/, '')
    const $title = document.createElement('h2')
    $title.append(...censor(title))
    article.append($title)

    for (const token of tokenize(title).filter((_, i) => i % 2)) {
      const cleanToken = normalizeToken(token)
      if (!freeTokens.has(cleanToken)) {
        titleTokens.add(cleanToken)
      }
    }

    for (const section of [data.lead.sections[0], ...data.remaining.sections]) {
      if (excludedSections.includes(section.anchor)) {
        continue
      }

      article.append(formatSection(section))
    }
  }

  // Stats
  function getDay (date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000)
  }
  const startDay = getDay(new Date('2023-03-09'))
  const currentDay = getDay(new Date()) - startDay

  const localData = (function () {
    let data = localStorage.getItem('censordle')
    if (data === null) {
      data = {
        stats: {},
        current: {}
      }
    } else {
      data = JSON.parse(data)
    }
    if (data.current.day !== currentDay) {
      data.current = { day: currentDay, guesses: [] }
    }
    return data
  })()

  function save () {
    localStorage.setItem('censordle', JSON.stringify(localData))
  }
  save()

  function decodeBase64 (encoded) {
    return decodeURIComponent(atob(encoded))
  }

  const currentTitle = decodeBase64(censordleTitles[currentDay])
  getPage(currentTitle).then(() => {
    for (const guess of localData.current.guesses) {
      reveal(guess, true)
    }
  })

  function updateStats () {
    document.querySelector('#stats tbody').replaceChildren()
    for (let day = 0; day <= currentDay; day++) {
      const $tr = document.createElement('tr')
      const $td0 = document.createElement('td')
      $td0.textContent = day + 1

      const $td1 = document.createElement('td')
      if (day === currentDay && !localData.stats[day]) {
        $td1.textContent = '?'
      } else {
        const title = decodeBase64(censordleTitles[day])
        const $a = document.createElement('a')
        $a.setAttribute('href', `https://en.wikipedia.org/wiki/${title}`)
        $a.setAttribute('target', '_blank')
        $a.textContent = title
        $td1.append($a)
      }

      const $td2 = document.createElement('td')
      $td2.textContent = localData.stats[day] || '-'

      $tr.append($td0, $td1, $td2)
      document.querySelector('#stats tbody').prepend($tr)
    }
  }
  updateStats()

  // Event listeners
  function openDialog (event) {
    event.preventDefault()
    document.getElementById(this.getAttribute('aria-controls')).show()
  }
  function submitGuess (event) {
    event.preventDefault()
    const text = this.word.value
    this.word.value = ''
    reveal(text, false)
  }

  for (const $link of document.querySelectorAll('body > header nav ul li a')) {
    $link.addEventListener('click', openDialog)
  }
  document.getElementById('guess').addEventListener('submit', submitGuess)
  document.getElementById('scroll-to-top').addEventListener('click', function (event) {
    event.preventDefault()
    document.getElementById('article').childNodes[0].scrollIntoView({
      behavior: 'smooth',
      top: 0
    })
  })
})()
