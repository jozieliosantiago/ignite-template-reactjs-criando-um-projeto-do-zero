import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import Link from 'next/link';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

import { useUtterances } from '../../hooks/useUtterances';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
interface PreviouNextPost {
  previousPost: { slug: string; title: string } | null;
  nextPost: { slug: string; title: string } | null;
}

interface PostProps {
  post: Post;
  previousNextPost: PreviouNextPost;
}

export default function Post({
  post,
  previousNextPost,
}: PostProps): JSX.Element {
  const commentNodeId = 'comments';
  useUtterances(commentNodeId);

  const router = useRouter();
  const formattedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  const editedDate =
    post.first_publication_date !== post.last_publication_date
      ? `* editado em ${format(new Date(post.last_publication_date), 'PPPp', {
          locale: ptBR,
        }).replace(' à', ', à')}`
      : null;

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

              {editedDate && (
                <div className={styles.postEditedDate}>
                  <i>
                    <span>{editedDate}</span>
                  </i>
                </div>
              )}
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

          <div className={styles.previousNext}>
            {previousNextPost.previousPost && (
              <div>
                <p>{previousNextPost.previousPost.title}</p>
                <Link href={`/post/${previousNextPost.previousPost.slug}`}>
                  <a>Post anterior</a>
                </Link>
              </div>
            )}

            {previousNextPost.nextPost && (
              <div className={styles.next}>
                <p>{previousNextPost.nextPost.title}</p>
                <Link href={`/post/${previousNextPost.nextPost.slug}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
            )}
          </div>

          <div id={commentNodeId} className={styles.postComents} />
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
  const { data, first_publication_date, last_publication_date, uid } = response;
  const { title, banner, author, content, subtitle } = data;

  const [previousPost, nextPost] = await Promise.all([
    await prismic.query(
      [
        Prismic.predicates.dateBefore(
          'document.first_publication_date',
          first_publication_date
        ),
      ],
      {
        fetch: ['posts.title'],
        orderings: '[document.first_publication_date desc]',
        pageSize: 1,
      }
    ),
    await prismic.query(
      [
        Prismic.predicates.dateAfter(
          'document.first_publication_date',
          first_publication_date
        ),
      ],
      {
        fetch: ['posts.title'],
        orderings: '[document.first_publication_date]',
        pageSize: 1,
      }
    ),
  ]);

  const post = {
    first_publication_date,
    last_publication_date,
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

  const previousNextPost = {
    previousPost: previousPost.results[0]
      ? {
          slug: previousPost.results[0].uid,
          title: previousPost.results[0].data.title,
        }
      : null,
    nextPost: nextPost.results[0]
      ? {
          slug: nextPost.results[0].uid,
          title: nextPost.results[0].data.title,
        }
      : null,
  };

  return {
    props: {
      post,
      previousNextPost,
    },
  };
};
