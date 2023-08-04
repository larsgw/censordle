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
    // Added (PCS)
    '.pcs-collapse-table-container',
    '.pcs-edit-section-link-container',
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

  const censorChars = {
    default: '█',
    more_spacing: '▉',
    mixed_shades: '░▒▓█',
    random_letters: 'abcdefghijklmnopqrstxyz',
  }

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

  function censorToken (token, style) {
    const tokenLength = [...token].length
    const chars = censorChars[style]
    const charCount = chars.length

    if (charCount === 1) {
      return chars.repeat(tokenLength)
    } else {
      return Array(tokenLength).fill().map(() => chars[Math.floor(Math.random() * charCount)]).join('')
    }
  }

  function censor (text) {
    return tokenize(text).map((fragment, i) => {
      if (i % 2 && !freeTokens.has(normalizeToken(fragment))) {
        const id = registerToken(fragment)
        const $span = document.createElement('span')
        $span.dataset.token = id
        $span.textContent = censorToken(fragment, localData.settings.chars)
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
        load()
        localData.guesses[playDay].push(cleanToken)
        save()
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
        revealArticle()
        // Record win
        if (!fromState) {
          load()
          localData.stats[playDay] = guesses.size
          if (playDay !== currentDay) {
            delete localData.guesses[playDay]
          }
          save()
        }
        updateStats()
        document.getElementById('stats').showModal()
      }
    }

    highlight(id)
    if (!fromState) scroll(id)
  }

  function revealArticle () {
    const indices = {}
    for (const $span of document.querySelectorAll('#article [data-token]')) {
      const id = $span.dataset.token
      indices[id] = indices[id] || 0
      $span.textContent = tokens[id][indices[id]]
      indices[id]++
    }
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
    document.querySelector(`#guesses tbody tr[data-token="${id}"]`).scrollIntoView({
      behavior: 'instant',
      block: 'center'
    })
    setTimeout(function () {
      $tokens[scrollTo % $tokens.length].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }, 0)
  }

  // Load data
  function cleanHtml (element) {
    const attributes = Array.from(element.attributes).map(attribute => attribute.name)
    for (const attribute of attributes) {
      if (!['rowspan', 'colspan'].includes(attribute)) {
        element.removeAttribute(attribute)
      }
    }
    const children = []
    for (const child of element.childNodes) {
      if (child instanceof Element) {
        if (child.matches('h2, h3, h4, h5, h6')) {
          cleanHtml(child)
          const level = parseInt(child.tagName.slice(1)) + 1
          const $heading = document.createElement('h' + level)
          $heading.innerHTML = child.innerHTML
          children.push($heading)
        } else if (child.matches('i, br, p, ul, ol, li')) {
          cleanHtml(child)
          children.push(child)
        } else if (child.matches(excludedContent)) {
          continue
        } else if (child.matches('table, tr, th, td')) {
          cleanHtml(child)
          children.push(child)
        } else {
          cleanHtml(child)
          children.push(...child.childNodes)
        }
      } else {
        children.push(...censor(child.textContent))
      }
    }
    element.replaceChildren(...children)
  }

  async function getPage (id) {
    const apiBase = `https://en.wikipedia.org/api/rest_v1/page`
    const metadata = await fetch(`${apiBase}/summary/${id}`).then(request => request.json())
    const data = await fetch(`${apiBase}/mobile-html/${id}`).then(request => request.text())

    const title = metadata.titles.normalized.replace(/ \(.+?\)$/, '')
    const $title = document.createElement('h2')
    $title.append(...censor(title))
    article.append($title)

    for (const token of tokenize(title).filter((_, i) => i % 2)) {
      const cleanToken = normalizeToken(token)
      if (!freeTokens.has(cleanToken)) {
        titleTokens.add(cleanToken)
      }
    }

    const parser = new DOMParser()
    const doc = parser.parseFromString(data, 'text/html')
    const $sections = doc.querySelectorAll('#pcs > section')

    for (const $section of $sections) {
      if ($section.matches('.pcs-fold-hr ~ section')) {
        continue
      }

      cleanHtml($section)

      article.append($section)
    }
  }

  // Stats
  function getDay (date) {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000)
  }
  const startDay = getDay(new Date('2023-03-09'))
  const currentDay = getDay(new Date()) - startDay
  const linkDay = parseInt((new URL(window.location)).searchParams.get('day')) - 1
  const playDay = isNaN(linkDay) ? currentDay : linkDay

  let localData

  function load () {
    const data = localStorage.getItem('censordle')
    localData = data === null ? null : JSON.parse(data)
  }

  function save () {
    localStorage.setItem('censordle', JSON.stringify(localData))
  }

  function initialize () {
    load()

    if (localData === null) {
      localData = {
        stats: {},
        guesses: {},
        settings: {
          theme: 'dark',
          chars: 'default'
        }
      }
    }

    if (localData.guesses === undefined) {
      localData.guesses = {}
    }

    if (localData.guesses[playDay] === undefined && !localData.stats[playDay]) {
      localData.guesses[playDay] = []
    }

    // Upgrade data format
    if (localData.current) {
      localData.guesses[localData.current.day] = localData.current.guesses
      delete localData.current
    }

    if (localData.settings === undefined) {
      localData.settings = {}
    }

    if (localData.settings.theme === undefined) {
      localData.settings.theme = 'dark'
    }

    if (localData.settings.chars === undefined) {
      localData.settings.chars = 'default'
    }

    save()
  }
  initialize()

  function decodeBase64 (encoded) {
    return decodeURIComponent(atob(encoded))
  }

  const currentTitle = decodeBase64(censordleTitles[playDay])
  getPage(currentTitle).then(() => {
    if (localData.guesses[playDay]) {
      for (const guess of localData.guesses[playDay]) {
        reveal(guess, true)
      }
    } else {
      revealArticle()
    }
  })

  function updateStats () {
    load()

    document.querySelector('#stats tbody').replaceChildren()
    for (let day = 0; day <= currentDay; day++) {
      const $tr = document.createElement('tr')
      const $td0 = document.createElement('td')
      $td0.textContent = day + 1

      const $td1 = document.createElement('td')
      const $td2 = document.createElement('td')

      if (!localData.stats[day]) {
        $td1.textContent = '?'

        if (day === playDay) {
          $td2.textContent = '-'
        } else {
          const $a = document.createElement('a')
          $a.setAttribute('href', `?day=${day + 1}`)
          $a.setAttribute('target', '_blank')
          $a.textContent = 'Play'
          $td2.append($a)
        }
      } else {
        const title = decodeBase64(censordleTitles[day])
        const $a = document.createElement('a')
        $a.setAttribute('href', `https://en.wikipedia.org/wiki/${title}`)
        $a.setAttribute('target', '_blank')
        $a.textContent = title
        $td1.append($a)

        $td2.textContent = localData.stats[day]
      }

      $tr.append($td0, $td1, $td2)
      document.querySelector('#stats tbody').prepend($tr)
    }
  }

  function updateSections () {
    const content = document.querySelector('#article')
    const $lists = [
      null, // h1 is not used
      document.querySelector('#sections > ul')
    ]
    $lists[1].replaceChildren()
    for (const $h of content.querySelectorAll('h2, h3, h4, h5, h6')) {
      const level = parseInt($h.tagName[1])
      if (level <= $lists.length) {
        const difference = $lists.length - level
        const $last = $lists.splice(-difference, difference)
        for (const $ul of $last) {
          if (!$ul.hasChildNodes()) {
            $ul.remove()
          }
        }
      }

      const $li = document.createElement('li')
      const $span = document.createElement('span')
      $span.textContent = $h.textContent
      $span.addEventListener('click', function (event) {
        event.preventDefault()
        document.getElementById('sections').close()
        $h.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      })
      $li.append($span)
      const $ul = document.createElement('ul')
      $li.append($ul)
      $lists[$lists.length - 1].append($li)

      $lists.push($ul)
    }
  }

  function updateSettings () {
    const $form = document.querySelector('#settings form:not([method="dialog"])')
    $form.theme.value = localData.settings.theme
    $form.chars.value = localData.settings.chars
  }
  updateSettings()

  function applySettings () {
    const $form = document.querySelector('#settings form:not([method="dialog"])')

    // Apply theme
    document.body.dataset.theme = $form.theme.value

    // Apply censor chars
    if (localData.settings.chars !== $form.chars.value) {
      for (const $span of document.querySelectorAll('#article [data-token]')) {
        const token = tokens[$span.dataset.token]
        if (!guesses.has(normalizeToken(token[0]))) {
          $span.textContent = censorToken($span.textContent, $form.chars.value)
        }
      }
    }
  }
  applySettings()

  // Event listeners
  const onOpenDialog = {
    stats: updateStats,
    settings: updateSettings,
    sections: updateSections,
  }

  function openDialog (event) {
    event.preventDefault()
    const id = this.getAttribute('aria-controls')
    if (id in onOpenDialog) {
      onOpenDialog[id]()
    }
    document.getElementById(id).showModal()
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
  document.querySelector('#settings form:not([method="dialog"])').addEventListener('submit', function (event) {
    event.preventDefault()
    applySettings()

    load()
    localData.settings.theme = this.theme.value
    localData.settings.chars = this.chars.value
    save()
  })

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
  }

})()

