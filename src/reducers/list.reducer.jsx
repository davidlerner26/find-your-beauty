export const listReducer = (list, action) => {
  switch (action?.type) {
    case 'add':
      return [...list, { name: action?.input }];
    case 'remove':
      return [...list.filter((i) => i.name !== action?.item?.name)];
    default:
      throw Error('Unknown action: ' + action?.type);
  }
};
