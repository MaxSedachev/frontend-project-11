import { object, string, setLocale } from 'yup';
import onChange from 'on-change';
import i18next from 'i18next';
import axios from 'axios';
import * as bootstrap from 'bootstrap';
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
      statusModal: 'filling',
      feedback: '',
    },
    addedUrls: [],

    modalWindow: {
      active: false,
      dataId: '',
    },

    feeds: [],
    posts: [],
    visitedLinks: [],
    modalId: '',
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
        .required(i18nextInstance.t('errors.required'))
        .notOneOf(state.addedUrls, i18nextInstance.t('errors.alreadyExist')),
    });
    return schema.validate({ url });
  };

  const input = document.querySelector('#url-input');
  const form = document.querySelector('.rss-form');
  const feedBackEl = document.querySelector('.feedback');

  const updateFeedback = (type, message) => {
    feedBackEl.textContent = message;
    feedBackEl.classList.toggle('text-danger', type === 'error');
    feedBackEl.classList.toggle('text-success', type === 'success');
  };

  const watchedState = onChange(state, (path, currentValue) => {
    if (path === 'form.status') {
      const submitButton = document.querySelector('[type="submit"]');
      if (currentValue === 'sending') {
        submitButton.setAttribute('disabled', true);
      } else {
        submitButton.removeAttribute('disabled');
      }
    }

    if (path === 'form.feedback.success') {
      updateFeedback('success', currentValue);
      if (watchedState.form.status) {
        feedBackEl.classList.remove('text-danger');
        feedBackEl.classList.add('text-success');
      } else {
        feedBackEl.classList.remove('text-success');
        feedBackEl.classList.add('text-danger');
      }
    }

    if (path === 'form.feedback.errors') {
      updateFeedback('error', currentValue);
    }

    if (path === 'form.status') {
      input.classList.toggle('is-invalid', !currentValue);
    }
    if (path === 'feeds') {
      const feedsDiv = document.querySelector('.feeds');
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
      const postsDiv = document.querySelector('.posts');
      postsDiv.innerHTML = `<div class="card border-0">
      <div class="card-body"><h2 class="card-title h4">Посты</h2></div>
      <ul class="list-group border-0 rounded-0"></ul></div></div>`;
      const list = postsDiv.querySelector('ul');
      watchedState.posts.forEach((post) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');
        li.innerHTML = `<a href="${post.link}" id="link-test" class="fw-bold" data-id="${post.id}" target="_blank" rel="noopener noreferrer">${post.title}</a>
        <button type="button" class="btn btn-outline-primary btn-sm" data-id="${post.id}">Просмотр</button></li>`;
        list.appendChild(li);
      });
      const links = document.querySelectorAll('.fw-bold');
      links.forEach((link) => {
        link.addEventListener('click', () => {
          const linkId = link.getAttribute('data-id');
          watchedState.visitedLinks.push(linkId);
        });
      });

      const buttons = document.querySelectorAll('.btn-outline-primary');
      buttons.forEach((button) => {
        button.addEventListener('click', () => {
          const postId = button.getAttribute('data-id');
          watchedState.modalId = postId;
          const myModal = new bootstrap.Modal(document.getElementById('modal'), {});
          myModal.show();
          const link = document.querySelector(`a[data-id="${postId}"]`);
          link.classList.replace('fw-bold', 'fw-normal');
          link.classList.add('link-secondary');
        });
      });
    }
    if (path === 'modalId') {
      const currentPost = watchedState.posts.find((post) => post.id === currentValue);
      const modalTitle = document.querySelector('.modal-title');
      const modalBody = document.querySelector('.modal-body');
      const modalLink = document.querySelector('a.full-article');
      modalTitle.textContent = currentPost.title;
      modalBody.textContent = currentPost.description;
      modalLink.setAttribute('href', currentPost.link);
    }
    if (path === 'visitedLinks') {
      const id = currentValue[currentValue.length - 1];
      const link = document.querySelector(`a[data-id="${id}"]`);
      link.classList.replace('fw-bold', 'fw-normal');
      link.classList.add('link-secondary');
    }
  });

  const checkForNewPosts = () => {
    console.log('Проверка нового поста...');
    const promises = state.addedUrls.map((url) => axios.get(`${routes.allOrigins()}${url}`, { timeout: 10000 })
      .then((response) => {
        const parsedData = parseDOM(response.data.contents);
        const posts = parsedData.querySelectorAll('item');
        const newPostsArray = [];
        posts.forEach((post) => {
          const postTitle = post.querySelector('title').textContent;
          const postDescription = post.querySelector('description').textContent;
          const postLink = post.querySelector('link').textContent;
          const postId = post.querySelector('guid') ? post.querySelector('guid').textContent : postLink;

          if (!state.posts.some((innerPost) => innerPost.id === postId)) {
            newPostsArray.push({
              id: postId, title: postTitle, description: postDescription, link: postLink,
            });
          }
        });
        if (newPostsArray.length) {
          watchedState.posts.unshift(...newPostsArray);
        }
      })
      .catch((err) => {
        console.error(err);
      }));
    Promise.all(promises).finally(() => {
      setTimeout(checkForNewPosts, 5000);
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const url = formData.get('url');
    validateUrl(url)
      .then(async (validUrl) => {
        // watchedState.form.feedback = '';
        watchedState.form.status = true;
        watchedState.form.feedback = i18nextInstance.t('success');
        console.log('watchedState.form.feedback:', watchedState.form.feedback);
        watchedState.addedUrls.push(url);
        watchedState.form.status = 'sending';
        return axios.get(`${routes.allOrigins()}${validUrl.url}`);
      })
      .then((response) => {
        const result = parseDOM(response.data.contents);
        if (result.querySelector('parsererror')) {
          throw new Error(i18nextInstance.t('errors.notContainRSS'));
        } else {
          watchedState.addedUrls.push(url);
          watchedState.form.feedback = i18nextInstance.t('success');
          console.log('watchedState.form.feedback:', watchedState.form.feedback);
        }
        const feedtitle = result.querySelector('title');
        const feedDescription = result.querySelector('description');

        watchedState.feeds.unshift({
          title: feedtitle.textContent,
          description: feedDescription.textContent,
        });

        const posts = result.querySelectorAll('item');
        const postsArray = [];

        posts.forEach((innerPost) => {
          const postTitle = innerPost.querySelector('title').textContent;
          const postDescription = innerPost.querySelector('description').textContent;
          const postLink = innerPost.querySelector('link').textContent;
          const postId = innerPost.querySelector('guid') ? innerPost.querySelector('guid').textContent : postLink;
          postsArray.unshift({
            id: postId,
            title: postTitle,
            description: postDescription,
            link: postLink,
          });
        });

        postsArray.reverse();
        watchedState.posts.unshift(...postsArray);
        e.target.reset();
        input.focus();
        watchedState.form.status = 'filling';
        checkForNewPosts();
        updateFeedback('success', watchedState.form.feedback);
      })
      .catch((error) => {
        watchedState.form.status = false;
        if (axios.isAxiosError(error)) {
          if (error.request) {
            watchedState.form.feedback = i18nextInstance.t('errors.networkError');
            console.log('watchedState.form.feedback:', watchedState.form.feedback);
          }
        } else {
          watchedState.form.feedback = error.message;
          updateFeedback('error', watchedState.form.feedback);
        }
        watchedState.form.status = 'filling';
      });
  });
  const modal = document.querySelector('#modal');
  modal.addEventListener('show.bs.modal', (e) => {
    if (e.target.getAttribute('data-id')) {
      const currentPostId = e.target.getAttribute('data-id');
      watchedState.visitedLinks.push(currentPostId);
      watchedState.modalId = currentPostId;

      const link = document.querySelector(`a[data-id="${currentPostId}"]`);
      link.classList.replace('fw-bold', 'fw-normal');
      link.classList.add('link-secondary');
    }
  });

  const links = document.querySelectorAll('.fw-bold');
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const linkId = link.getAttribute('data-id');
      watchedState.visitedLinks.push(linkId);
    });
  });
};
