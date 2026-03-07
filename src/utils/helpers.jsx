// Utility functions
export const copyToClipboard = (text) => {
  if (text && navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }
};

export const formatBytes = (n) => {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1048576).toFixed(2) + ' MB';
};

export const classifyIP = (ip) => {
  if (!ip) return '';
  if (ip.startsWith('10.')) return 'Class A · RFC 1918 Private';
  if (ip.startsWith('192.168.')) return 'Class C · RFC 1918 Private';
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 'Class B · RFC 1918 Private';
  if (ip.startsWith('169.254.')) return 'APIPA · Link-Local';
  return 'Routable · Public';
};

export const syntaxHighlight = (json) => {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-num';
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'json-key' : 'json-str';
        else if (/true|false/.test(match)) cls = 'json-bool';
        else if (/null/.test(match)) cls = 'json-null';
        return `<span class="${cls}">${match}</span>`;
      }
    );
};

export const renderTable = (pairs) => {
  return (
    <table className="dtable">
      <tbody>
        {pairs.map(([key, value], idx) => (
          <tr key={idx}>
            <td>{key}</td>
            <td>{value ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
