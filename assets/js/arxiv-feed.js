(function () {
  var feeds = document.querySelectorAll('[data-arxiv-feed]');
  if (!feeds.length) return;

  var clean = function (value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  };

  var truncate = function (text, max) {
    var limit = Number(max) || 0;
    if (!limit || text.length <= limit) return text;
    return text.slice(0, limit).replace(/\s+$/, '') + '…';
  };

  var firstText = function (node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el ? el.textContent : '';
  };

  var formatDate = function (value) {
    if (!value) return '';
    var parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return clean(value);
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  feeds.forEach(function (container) {
    var searchQuery = container.getAttribute('data-arxiv-search') || '';
    var idList = container.getAttribute('data-arxiv-ids') || '';
    var maxResults = container.getAttribute('data-arxiv-max') || '10';
    var preview = container.getAttribute('data-arxiv-preview') || '500';
    var proxyBase = 'https://api.allorigins.win/raw?url=';

    var renderError = function (message) {
      container.innerHTML = '<p class="arxiv-feed__error">' + message + '</p>';
    };

    var query = idList
      ? 'id_list=' + encodeURIComponent(idList)
      : searchQuery
        ? 'search_query=' + encodeURIComponent(searchQuery)
        : '';

    if (!query) {
      renderError('Add an arXiv search_query or id_list in _config.yml.');
      return;
    }

    var apiUrl = 'https://export.arxiv.org/api/query?' + query +
      '&sortBy=submittedDate&sortOrder=descending' +
      '&max_results=' + encodeURIComponent(maxResults);

    var url = proxyBase + encodeURIComponent(apiUrl);

    container.innerHTML = '<p class="arxiv-feed__loading">Loading arXiv papers…</p>';

    fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Bad response');
        }
        return response.text();
      })
      .then(function (xmlText) {
        return new window.DOMParser().parseFromString(xmlText, 'text/xml');
      })
      .then(function (xmlDoc) {
        var entries = Array.prototype.slice.call(xmlDoc.getElementsByTagName('entry'));
        if (!entries.length) {
          renderError('No arXiv papers found for this query yet.');
          return;
        }

        var list = document.createElement('div');
        list.className = 'arxiv-feed__list';

        entries.forEach(function (entry) {
          var title = clean(firstText(entry, 'title'));
          var link = clean(firstText(entry, 'id'));
          var summary = clean(firstText(entry, 'summary'));
          var published = clean(firstText(entry, 'published'));
          var categoryNode = entry.getElementsByTagName('category')[0];
          var primaryCategory = categoryNode ? categoryNode.getAttribute('term') : '';

          var authors = Array.prototype.slice.call(entry.getElementsByTagName('author'))
            .map(function (authorNode) {
              return clean(firstText(authorNode, 'name'));
            })
            .filter(Boolean);

          var item = document.createElement('article');
          item.className = 'arxiv-feed__item';

          var titleEl = document.createElement('h3');
          titleEl.className = 'arxiv-feed__title';
          var titleLink = document.createElement('a');
          titleLink.href = link || '#';
          titleLink.target = '_blank';
          titleLink.rel = 'noopener noreferrer';
          titleLink.textContent = title || 'Untitled arXiv submission';
          titleEl.appendChild(titleLink);
          item.appendChild(titleEl);

          var metaEl = document.createElement('p');
          metaEl.className = 'arxiv-feed__meta';
          var authorText = authors.length ? authors.join(', ') : '';
          var dateText = published ? formatDate(published) : '';
          var metaBits = [];
          if (authorText) metaBits.push(authorText);
          if (dateText) metaBits.push(dateText);
          if (primaryCategory) metaBits.push(primaryCategory);
          metaEl.textContent = metaBits.join(' • ');
          item.appendChild(metaEl);

          if (summary) {
            var summaryEl = document.createElement('p');
            summaryEl.className = 'arxiv-feed__summary';
            summaryEl.textContent = truncate(summary, preview);
            item.appendChild(summaryEl);
          }

          if (link) {
            var linkEl = document.createElement('a');
            linkEl.className = 'arxiv-feed__cta';
            linkEl.href = link;
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';
            linkEl.textContent = 'View on arXiv';
            item.appendChild(linkEl);
          }

          list.appendChild(item);
        });

        container.innerHTML = '';
        container.appendChild(list);
      })
      .catch(function () {
        renderError('Unable to load arXiv data right now. Please try again later.');
      });
  });
})();

