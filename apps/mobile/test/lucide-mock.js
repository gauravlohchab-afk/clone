// Icons are presentational; render a plain View so screens can be tested without SVG.
const React = require('react');
const { View } = require('react-native');
module.exports = new Proxy({}, { get: (_t, name) => (name === '__esModule' ? false : (props) => React.createElement(View, { testID: `icon-${String(name)}`, accessibilityLabel: props.accessibilityLabel })) });
