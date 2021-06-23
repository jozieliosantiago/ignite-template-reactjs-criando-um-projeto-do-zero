import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );
  const wordsPerMinute = 200;

  const totalWords = post.data.content.reduce(
    (totalWordsAccumulator, currentValue) => {
      const titleLength = currentValue.heading.split(' ').length;
      const bodyContent = currentValue.body.map(
        content => content.text.split(' ').length
      );

      const bodyContentLength = bodyContent.reduce(
        (totalLength, currentLength) => {
          return totalLength + currentLength;
        },
        0
      );

      return totalWordsAccumulator + titleLength + bodyContentLength;
    },
    0
  );

  const timeToRead = Math.ceil(totalWords / wordsPerMinute);

  return (
    <>
      {router.isFallback ? (
        <p>Carregando...</p>
      ) : (
        <div className={`${commonStyles.textConfig} ${styles.postContainer}`}>
          <div className={styles.postImage}>
            <img src={post.data.banner.url} alt="" />
          </div>

          <div className={styles.postContent}>
            <div className={styles.postHeader}>
              <h1>{post.data.title}</h1>

              <div className={styles.postInfo}>
                <div>
                  <span>
                    <FiCalendar />
                  </span>
                  <span>{formattedDate}</span>
                </div>

                <div>
                  <span>
                    <FiUser />
                  </span>
                  <span>{post.data.author}</span>
                </div>

                <div>
                  <span>
                    <FiClock />
                  </span>
                  <span>{timeToRead} min</span>
                </div>
              </div>
            </div>

            <div className={styles.postBody}>
              {post.data.content.map(postContent => (
                <section key={`${postContent.heading} ${Math.random()}`}>
                  <h2>{postContent.heading}</h2>

                  {postContent.body.map(postBody => (
                    <p
                      key={Math.random()}
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: postBody.text }}
                    />
                  ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title'],
    }
  );

  const paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid,
      },
    };
  });

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const {
    params: { slug },
  } = context;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});
  const { data, first_publication_date, uid } = response;
  const { title, banner, author, content, subtitle } = data;

  const post = {
    first_publication_date,
    uid,
    data: {
      subtitle,
      title,
      banner: {
        url: banner.url,
      },
      author,
      content,
    },
  };

  return {
    props: {
      post,
      response,
    },
  };
};
