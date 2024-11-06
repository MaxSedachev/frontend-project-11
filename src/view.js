import { object, string, setLocale } from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import resources from '../locales/index.js';

export default () => {
  const state = {
    form: {
      status: true,
      feedback: '',
    },
    feeds: [],
  };

  const i18nextInstance = i18next.createInstance();
  i18nextInstance.init({
    lng: 'ru',
    debug: true,
    resources,
  });
  setLocale({
    string: {
      url: () => ({ key: 'invalidUrl' }),
    },
  });

  const validateUrl = (url) => {
    const schema = object({
      url: string()
        .url(i18nextInstance.t('errors.invalidURL'))
        .required()
        .notOneOf(state.feeds, i18nextInstance.t('errors.invalidURL')),
    });
    return schema.validate({ url });
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.feedback') {
      feedBackEl.textContent = currentValue;
    }
    if (path === 'form.status') {
      input.classList.toggle('is-invalid', !currentValue);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    validateUrl(url)
      .then(() => {
        watchedState.form.status = true;
        watchedState.form.feedback = i18nextInstance.t('success');
        watchedState.feeds.push(url);
      })
      .catch((error) => {
        watchedState.form.feedback = error.message;
        watchedState.form.status = false;
      });
  });
};
