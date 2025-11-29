/**
 * HATEOAS Helper - Generate Hypermedia links for REST API responses
 */

/**
 * Generate HATEOAS links for a resource
 */
function generateLinks(baseUrl, resource, id) {
  const links = {
    self: `${baseUrl}/${resource}/${id}`,
    collection: `${baseUrl}/${resource}`
  };

  if (resource === 'gauges') {
    links.checkout = `${baseUrl}/${resource}/${id}/assignments`;
    links.calibrations = `${baseUrl}/${resource}/${id}/calibrations`;
    links.assignments = `${baseUrl}/${resource}/${id}/assignments`;
  }

  return links;
}

/**
 * Add HATEOAS links to response data
 */
function addHATEOAS(data, req, resourceType = 'gauges') {
  const baseUrl = `${req.protocol}://${req.get('host')}/api`;

  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      _links: generateLinks(baseUrl, resourceType, item.id || item.gauge_id)
    }));
  }

  return {
    ...data,
    _links: generateLinks(baseUrl, resourceType, data.id || data.gauge_id)
  };
}

/**
 * Generate pagination links for list responses
 */
function generatePaginationLinks(req, page, limit, totalPages) {
  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;

  return {
    self: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    first: `${baseUrl}?page=1&limit=${limit}`,
    last: `${baseUrl}?page=${totalPages}&limit=${limit}`,
    next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
    prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null
  };
}

module.exports = {
  generateLinks,
  addHATEOAS,
  generatePaginationLinks
};
