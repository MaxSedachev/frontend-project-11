import { object, string, setLocale } from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import axios from 'axios';
import resources from '../locales/index.js';

const parseDOM = (data) => {
  const parser = new DOMParser();
  return parser.parseFromString(data, 'application/xml');
};

const routes = {
  allOrigins: () => 'https://allorigins.hexlet.app/get?disableCache=true&url=',
};

export default () => {
  const state = {
    form: {
      status: true,
      feedback: '',
    },
    addedUrls: [],

    modalWindow: {
      active: false,
      dataId: '',
    },

    feeds: [],
    posts: [],
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
        .notOneOf(state.addedUrls, i18nextInstance.t('errors.invalidURL')),
    });
    return schema.validate({ url });
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');
  const feedsDiv = document.querySelector('.feeds');
  const postsDiv = document.querySelector('.posts');
  const modalTitle = document.querySelector('.modal-title');
  const modalBody = document.querySelector('.modal-body');
  const modalLinkButton = document.querySelector('a.full-article');

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.feedback') {
      feedBackEl.textContent = currentValue;
      console.log('feedBackEl.textContent:', feedBackEl.textContent);
      if (watchedState.form.status) {
        feedBackEl.classList.remove('text-danger');
        feedBackEl.classList.add('text-success');
      } else {
        feedBackEl.classList.remove('text-success');
        feedBackEl.classList.add('text-danger');
      }
    }
    if (path === 'form.status') {
      input.classList.toggle('is-invalid', !currentValue);
    }
    if (path === 'feeds') {
      feedsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Фиды</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div>`;
      const list = feedsDiv.querySelector('ul');
      state.feeds.forEach((feed) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'border-0', 'border-end-0');
        li.innerHTML = `<h3 class="h6 m-0">${feed.title}</h3>
        <p class="m-0 small text-black-50">${feed.description}</p>`;
        list.appendChild(li);
      });
    }
    if (path === 'posts') {
      postsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div></div>`;
      const list = postsDiv.querySelector('ul');
      state.posts.forEach((post) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
        li.innerHTML = `<a href="${post.link}" class="fw-bold" data-id="${post.id}" target="_blank" rel="noopener noreferrer">${post.title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="${post.id}" data-bs-toggle="modal" data-bs-target="#modal">Просмотр</button></li>`;
        list.appendChild(li);
      });
    }
    if (path === 'modalWindow.active') {
      const currentPost = state.posts.find((post) => post.id === state.modalWindow.dataId);
      modalTitle.textContent = currentPost.title;
      modalBody.textContent = currentPost.description;
      modalLinkButton.setAttribute('href', currentPost.link);
    }
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    validateUrl(url)
      .then(async (validUrl) => {
        watchedState.form.feedback = '';
        watchedState.form.status = true;
        watchedState.form.feedback = i18nextInstance.t('success');
        watchedState.addedUrls.push(url);
        console.log('validUrl:', validUrl);
        return axios.get(`${routes.allOrigins()}${validUrl.url}`);
      })
      .then((response) => {
        const result = parseDOM(response.data.contents);
        console.log('result:', result);
        if (result.querySelector('parsererror')) {
          throw new Error(i18nextInstance.t('errors.notContainRSS'));
        } else {
          watchedState.addedUrls.push(url);
          watchedState.form.feedback = i18nextInstance.t('success');
        }
        const feedtitle = result.querySelector('title');
        const feedDescription = result.querySelector('description');
        watchedState.feeds.push({
          title: feedtitle.textContent,
          description: feedDescription.textContent,
        });
        let idCounter = 0;

        const uniqueId = () => {
          idCounter += 1;
          return idCounter;
        };
        const posts = result.querySelectorAll('item');
        posts.forEach((post) => {
          const postTitle = post.querySelector('title');
          const postDescription = post.querySelector('description');
          const postLink = post.querySelector('link');
          watchedState.posts.push({
            id: uniqueId(),
            title: postTitle.textContent,
            description: postDescription.textContent,
            link: postLink.textContent,
          });
        });
      })
      .catch((error) => {
        watchedState.form.status = false;
        if (axios.isAxiosError(error)) {
          if (error.request) {
            watchedState.form.feedback = i18nextInstance.t('errors.networkError');
          }
        } else {
          watchedState.form.feedback = error.message;
        }
      });
  });
};
