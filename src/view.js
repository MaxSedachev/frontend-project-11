import { object, string } from 'yup';
import onChange from 'on-change';

export default () => {
  const state = {
    form: {
      status: true,
      feedback: '',
    },
    feeds: [],
  };

  const validateUrl = (url) => {
    const schema = object({
      url: string()
      .url('Ссылка должна быть валидным URL')
      .required('Ничего нет')
      .notOneOf(state.feeds, 'RSS уже существует'),
    });
    return schema.validate({url})
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.feedback') {
      feedBackEl.textContent = currentValue;
    }
    if (path === 'form.status') {
      if (state.form.status === false) {
        input.classList.add('is-invalid');
      } else {
        input.classList.remove('is-invalid');
      }
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    validateUrl(url)
      .then(() => {
        watchedState.form.status = true;
        watchedState.form.feedback = 'RSS-канал был успешно загружен';
        watchedState.feeds.push(url);
      })
      .catch((error) => {
        watchedState.form.feedback = error.message;
        watchedState.form.status = false;
      })
  });
};