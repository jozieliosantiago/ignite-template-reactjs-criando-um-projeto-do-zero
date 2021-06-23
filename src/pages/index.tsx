import { GetStaticProps } from 'next';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import { FiCalendar, FiUser } from 'react-icons/fi';

import Prismic from '@prismicio/client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useState } from 'react';
import { useCallback } from 'react';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<PostPagination>({} as PostPagination);

  const formatDate = useCallback(date => {
    return format(new Date(date), 'dd MMM yyyy', {
      locale: ptBR,
    });
  }, []);

  useEffect(() => {
    const { next_page } = postsPagination;
    const formattedPosts = postsPagination.results.map(post => {
      return {
        ...post,
        first_publication_date: formatDate(post.first_publication_date),
      };
    });

    setPosts({
      next_page,
      results: formattedPosts,
    });
  }, [postsPagination, formatDate]);

  function loadMore(nextPage): void {
    fetch(nextPage)
      .then(response => {
        return response.json();
      })
      .then(postsResponse => {
        const { next_page } = postsResponse;

        const results = postsResponse.results.map(post => {
          return {
            ...post,
            first_publication_date: formatDate(post.first_publication_date),
          };
        });

        setPosts(state => {
          return {
            next_page,
            results: [...state.results, ...results],
          };
        });
      });
  }

  return (
    <div className={styles.homeContainer}>
      {posts.results?.length && (
        <>
          {posts.results.map(post => (
            <div
              key={post.uid}
              className={`${styles.content} ${commonStyles.textConfig}`}
            >
              <Link href={`/post/${post.uid}`}>
                <a>
                  <h1>{post.data.title}</h1>
                  <p>{post.data.subtitle}</p>
                  <div className={styles.info}>
                    <span className={styles.dateInfo}>
                      <FiCalendar />
                      {post.first_publication_date}
                    </span>
                    <span>
                      <FiUser />
                      {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            </div>
          ))}

          {posts.next_page && (
            <button
              onClick={() => loadMore(posts.next_page)}
              type="button"
              className={styles.loadMore}
            >
              Carregar mais posts
            </button>
          )}
        </>
      )}
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse: PostPagination = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 3,
    }
  );

  const { next_page } = postsResponse;

  const results = postsResponse.results.map(post => {
    const { data, first_publication_date, uid } = post;
    return {
      uid,
      first_publication_date,
      data,
    };
  });

  const postsPagination = {
    next_page,
    results,
  };

  return {
    props: {
      postsPagination,
    },
  };
};
