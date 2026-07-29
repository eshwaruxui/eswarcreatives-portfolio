import { useEffect, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, ExternalLink, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { PortfolioButton } from "./ui/portfolio-button";
import { LandingNav } from "../../components/LandingNav";
import { useBreakpoint } from "../../portal/hooks/useBreakpoint";
import { t, tokens, motionTokens } from "../../portal/theme";
import { CTAButton } from "../../components/marketing/CTAButton";
import { FitPill } from "../../components/marketing/FitPill";
import { BeforeAfterCard, type BeforeAfterCardType } from "../../components/marketing/BeforeAfterCard";
import { IconWrapper } from "../../components/marketing/IconWrapper";

const WHATSAPP_URL = "https://wa.me/919841085484";
const RETAINER_WHATSAPP_URL =
  "https://wa.me/919841085484?text=Hi%2C%20I%27m%20interested%20in%20the%20Performance%20Growth%20Retainer%20on%20eswarcreatives.in";
const BRAND_BRIEF_MAILTO = "mailto:eswar@eswarcreatives.in?subject=Brand%20brief";
const LETS_TALK_MAILTO = "mailto:eswar@eswarcreatives.in?subject=Let%27s%20talk%20about%20my%20brand";

type CarouselSlide = {
  id: string;
  cardType: BeforeAfterCardType;
  categoryLabel: string;
  proofCaption?: string;
  before?: ReactNode;
  after: ReactNode;
  // Exact Figma "Footer section" (node 4424:6945): brand name + category +
  // an Instagram social-proof link. Only slides with a real, shipped case
  // study carry this — placeholders fall back to the generic caption below.
  footer?: { brandName: string; category: string; socialProofUrl?: string };
};

function ChecklistItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}>
      <Check size={14} style={{ color: tokens.accent, marginTop: 3, flexShrink: 0 }} />
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, color: t.text.secondary, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function VerticalTab({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        background: t.background.subtleWarm,
        borderRadius: "8px 0 0 8px",
        padding: "12px 4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "'SF Mono', monospace",
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "1.5px",
          color: t.text.secondary,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </p>
    </div>
  );
}

// ICP fit-pill icons — inlined from the hi-fi design's exported illustrations
// ("assets and visuals/img/branding/icp section/{Growth,Team,Trophy}.svg").
// stroke="currentColor" (source files hardcoded stroke="#D5B067", i.e.
// tokens.gold exactly) so they still recolor through IconWrapper like every
// other icon on this page, instead of shipping as static image assets.
function GrowthIcon() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.329 44.5123C10.329 44.5123 40.4729 34.246 54.4709 11.0265M49.1151 12.2538L54.5468 10.6035L55.6166 16.3338M8.72066 63.2869V56.5781C8.72066 55.583 8.72066 55.0357 9.07724 54.5796C9.16846 54.4635 9.26797 54.364 9.37578 54.2811C9.84016 53.9245 10.3875 53.9245 11.3743 53.9245H13.6299C14.625 53.9245 15.1724 53.9245 15.6285 54.2811C15.7446 54.3723 15.8441 54.4718 15.927 54.5796C16.2836 55.044 16.2836 55.5913 16.2836 56.5781V63.2869M23.1 63.2869V49.944C23.1 48.9489 23.1 48.4016 23.4566 47.9455C23.5478 47.8294 23.6474 47.7298 23.7552 47.6469C24.2195 47.2903 24.7669 47.2903 25.7537 47.2903H28.0093C29.0044 47.2903 29.5518 47.2903 30.0078 47.6469C30.1239 47.7381 30.2235 47.8377 30.3064 47.9455C30.663 48.4098 30.663 48.9572 30.663 49.944V63.2869M37.4875 63.2869V36.6757C37.4875 35.6806 37.4875 35.1333 37.8441 34.6772C37.9353 34.5611 38.0348 34.4616 38.1426 34.3786C38.607 34.022 39.1544 34.022 40.1412 34.022H42.3968C43.3919 34.022 43.9392 34.022 44.3953 34.3786C44.5114 34.4698 44.6109 34.5694 44.6939 34.6772C45.0504 35.1416 45.0504 35.6889 45.0504 36.6757V40.4986M51.8685 37.5961V26.2517C51.8685 25.2566 51.8685 24.7093 52.2251 24.2532C52.3163 24.1371 52.4158 24.0376 52.5236 23.9547C52.988 23.5981 53.5354 23.5981 54.5222 23.5981H56.7778C57.7729 23.5981 58.3202 23.5981 58.7763 23.9547C58.8924 24.0459 58.9919 24.1454 59.0749 24.2532C59.4315 24.7176 59.4314 25.2649 59.4314 26.2517V39.5449M56.6531 46.3864H48.4931M48.4008 49.4961H55.972C55.972 49.4961 52.7711 53.1864 48.5916 53.8664L54.413 58.3361M60.7237 55.3176C60.7237 55.3176 58.8828 60.1688 54.413 61.0478M2.00391 63.602H43.1854M62.2506 63.602H65.9989M18.4646 36.4932C18.4646 36.4932 26.3011 33.425 33.4909 26.9567M64.1907 52.4981C64.1907 58.8504 59.0411 64 52.6888 64C46.3364 64 41.1868 58.8504 41.1868 52.4981C41.1868 46.1457 46.3364 40.9961 52.6888 40.9961C59.0411 40.9961 64.1907 46.1457 64.1907 52.4981Z"
        stroke="currentColor"
        strokeWidth="1.11951"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.0786 64H55.928M50.1586 63.9463C50.1586 63.9463 49.813 55.9502 49.7055 53.3232C49.5979 50.8729 44.1212 47.2243 39.2129 45.7264C38.5907 45.5344 37.9147 45.7034 37.4539 46.1643C36.2863 47.3395 35.1725 48.3611 34.366 49.0678C33.667 49.6899 32.6147 49.6899 31.9157 49.0678C31.1091 48.3611 29.9954 47.3395 28.8278 46.1643C28.3669 45.7034 27.6909 45.5344 27.0688 45.7264C22.1604 47.2243 16.6837 50.8652 16.5762 53.3232C16.461 55.9502 16.123 63.9463 16.123 63.9463M22.1525 56.3264L22.4521 64M44.1291 56.3264L43.8295 64M6.42145 35.0728V30.6821C6.42145 29.4297 7.43194 28.4192 8.68439 28.4192C9.93683 28.4192 10.9473 29.4297 10.9473 30.6821V35.0728M24.4949 16.5222C22.7931 17.1151 21.1691 17.8866 19.6476 18.8048M7.74083 47.8292C8.52896 50.9165 9.86478 53.7848 11.636 56.3264M58.4462 48.6585C57.6413 51.4302 56.3915 54.0139 54.7798 56.3264M49.2006 20.4634C47.291 18.9968 45.1715 17.7872 42.8955 16.884M40.2189 35.3413C40.2189 39.2357 37.0465 44.0902 33.1368 44.0902C29.227 44.0902 26.0546 39.2357 26.0546 35.3413C26.0546 31.4469 29.227 28.2899 33.1368 28.2899C37.0465 28.2899 40.2189 31.4469 40.2189 35.3413ZM4.61361 43.2992C3.83795 43.2992 3.40386 43.2992 3.08364 42.9433C3.00536 42.8579 2.94131 42.7583 2.88438 42.6445C2.66378 42.2033 2.72783 41.6838 2.8488 40.7729L3.63158 34.6886C3.71697 34.0339 3.75967 33.6781 4.02297 33.3863C4.08701 33.3152 4.15817 33.2511 4.23645 33.1942C4.54956 32.9736 4.88402 32.9736 5.49601 32.9736H11.8863C12.4983 32.9736 12.8328 32.9736 13.1459 33.1942C13.2242 33.2511 13.2953 33.3152 13.3594 33.3863C13.6227 33.6781 13.6654 34.0339 13.7508 34.6886L14.5335 40.7729C14.6474 41.6838 14.7186 42.1961 14.498 42.6445C14.441 42.7512 14.377 42.8508 14.2987 42.9433C13.9785 43.2992 13.5515 43.2992 12.7687 43.2992H4.61361ZM60.152 32.929C60.152 34.8079 58.6288 36.3311 56.7499 36.3311C54.871 36.3311 53.3478 34.8079 53.3478 32.929C53.3478 31.05 54.871 29.5269 56.7499 29.5269C58.6288 29.5269 60.152 31.05 60.152 32.929ZM48.2451 33.3078C48.2308 32.979 48.2308 32.6503 48.2594 32.3215C48.288 31.9427 48.5096 31.5996 48.8455 31.4209L49.9891 30.8134C50.2178 30.6919 50.3965 30.4846 50.4965 30.2416C50.4965 30.2416 50.4965 30.2416 50.4965 30.2345C50.6037 29.9915 50.6323 29.727 50.5609 29.4769L50.2178 28.2261C50.1177 27.8544 50.2178 27.4613 50.4679 27.1826C50.6895 26.9396 50.9254 26.7109 51.1755 26.4964C51.4614 26.2463 51.8617 26.1605 52.2262 26.2749L53.4627 26.6537C53.7129 26.7323 53.9773 26.7037 54.2203 26.6108C54.2203 26.6108 54.2203 26.6108 54.2275 26.6108C54.4705 26.5107 54.6778 26.3463 54.8064 26.1176L55.4497 24.9955C55.6427 24.6596 55.9857 24.4523 56.3717 24.438C56.7004 24.4237 57.0221 24.4309 57.3508 24.4523C57.7297 24.4809 58.0727 24.7025 58.2514 25.0384L58.8661 26.182C58.9876 26.4107 59.1948 26.5894 59.4379 26.6894C59.4379 26.6894 59.4379 26.6894 59.445 26.6894C59.688 26.7966 59.9525 26.8252 60.2026 26.7537L61.4534 26.4107C61.825 26.3106 62.2181 26.4107 62.4969 26.6608C62.7399 26.8824 62.9686 27.1183 63.183 27.3684C63.4332 27.6543 63.519 28.0545 63.4046 28.4191L63.0258 29.6555C62.9472 29.9057 62.9758 30.1701 63.0687 30.4132C63.0687 30.4132 63.0687 30.4132 63.0687 30.4203C63.1687 30.6633 63.3331 30.8706 63.5618 30.9992L64.6911 31.6425C65.0199 31.8283 65.2343 32.1785 65.2486 32.5573C65.2629 32.8861 65.2629 33.2149 65.2343 33.5437C65.2057 33.9225 64.9841 34.2655 64.6482 34.4442L63.5047 35.0517C63.2759 35.1732 63.0973 35.3805 62.9972 35.6235C62.9972 35.6235 62.9972 35.6235 62.9972 35.6307C62.89 35.8737 62.8614 36.1381 62.9329 36.3883L63.2759 37.6391C63.376 38.0036 63.2759 38.4038 63.0258 38.6826C62.8042 38.9256 62.5684 39.1543 62.3254 39.3687C62.0395 39.6189 61.6392 39.7046 61.2747 39.5974L60.0382 39.2258C59.7881 39.1471 59.5236 39.1757 59.2806 39.2686C59.2806 39.2686 59.2806 39.2686 59.2735 39.2686C59.0305 39.3687 58.8232 39.5331 58.6945 39.7618L58.0513 40.8911C57.8655 41.2198 57.5152 41.4343 57.1364 41.4486C56.8077 41.4628 56.4789 41.4628 56.1501 41.4343C55.7713 41.4057 55.4282 41.1841 55.2496 40.8482L54.642 39.7046C54.5205 39.4759 54.3133 39.2972 54.0702 39.1972C54.0702 39.1972 54.0702 39.1972 54.0631 39.1972C53.8201 39.09 53.5556 39.0614 53.3055 39.1328L52.0546 39.4759C51.6901 39.576 51.2899 39.4759 51.0111 39.2258C50.7681 39.0042 50.5394 38.7683 50.325 38.5253C50.0748 38.2394 49.9891 37.8392 50.0963 37.4747L50.4679 36.2382C50.5466 35.988 50.518 35.7236 50.4251 35.4806C50.4251 35.4806 50.4251 35.4806 50.4251 35.4734C50.3321 35.2304 50.1606 35.0232 49.939 34.8945L48.8098 34.2441C48.481 34.0511 48.2737 33.708 48.2523 33.3292L48.2451 33.3078ZM38.0449 15.555C38.0449 18.2276 35.8783 20.3942 33.2057 20.3942C30.5331 20.3942 28.3665 18.2276 28.3665 15.555C28.3665 12.8824 30.5331 10.7158 33.2057 10.7158C35.8783 10.7158 38.0449 12.8824 38.0449 15.555ZM14.5514 25.5861C17.1477 26.3004 17.4779 28.6663 17.4779 28.6663C17.4779 28.6663 17.7007 26.4848 20.4045 25.5861C17.693 24.6874 17.4779 22.5059 17.4779 22.5059C17.4779 22.5059 17.1477 24.8717 14.5514 25.5861ZM6.86397 18.0072C10.2739 18.9455 10.7077 22.0527 10.7077 22.0527C10.7077 22.0527 11.0003 19.1876 14.5514 18.0072C10.9902 16.8269 10.7077 13.9617 10.7077 13.9617C10.7077 13.9617 10.2739 17.069 6.86397 18.0072Z"
        stroke="currentColor"
        strokeWidth="1.11951"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10.4362 63.9998H57.7625M20.1882 63.9997V62.9051C20.1882 61.4788 21.4487 60.4505 22.8335 60.4505H45.3647C46.7579 60.4505 48.0101 61.4871 48.0101 62.9051V63.9997M25.5119 60.4422V59.3476C25.5119 57.9213 26.7724 56.893 28.1573 56.893H30.3714C30.2885 54.7286 29.9402 52.8379 28.9119 50.9222C26.9714 47.3066 23.6792 44.7442 21.3987 41.3691C18.8943 37.6705 18.828 31.6086 18.2973 28.25C18.2143 27.7442 18.148 27.2466 18.09 26.7408C18.0236 26.1935 17.9573 25.6544 17.8992 25.1071C17.7582 23.7803 18.1397 23.1998 19.6573 23.1998H48.549C50.0665 23.1998 50.448 23.7803 50.307 25.1071C50.249 25.6544 50.1909 26.1935 50.1163 26.7408C50.05 27.2465 49.9836 27.7527 49.909 28.25C49.3782 31.6003 49.3119 37.6622 46.8075 41.3691C44.527 44.7442 41.2348 47.3066 39.2943 50.9222C38.2661 52.8379 37.9178 54.7286 37.8348 56.893H40.049C41.4339 56.893 42.6943 57.9296 42.6943 59.3476V60.4422M18.149 26.7491H50.1173M29.8989 23.0587C28.6384 21.8563 27.8589 20.1646 27.8589 18.2904C27.8589 14.6582 30.8028 11.7061 34.4433 11.7061C38.0838 11.7061 41.0277 14.65 41.0277 18.2904C41.0277 20.0319 40.3477 21.6158 39.2448 22.7934L38.8633 23.1914M36.708 15.3882H32.0393M31.989 17.171H36.3261C36.3261 17.171 34.4934 19.2856 32.1051 19.6671L35.4388 22.2213M41.0941 23.2081C40.3478 22.6939 39.9414 22.1632 40.0658 21.732M49.4114 21.4253L48.5987 23.1999M28.1828 23.1252C28.7219 22.6857 29.0453 22.3623 28.9375 21.9974M19.5905 21.6988L20.171 23.1666M53.625 29.5685C53.9567 30.9865 52.6879 32.4792 51.3611 32.1143C49.545 31.6251 49.5035 29.1787 50.283 27.7026C51.7508 24.9163 55.7811 24.4353 57.9289 26.7075C61.105 30.0743 59.1396 35.1992 56.3698 38.1348C52.862 41.8417 47.5713 42.729 43.6572 45.847C42.9274 46.4275 42.3137 47.2651 42.1645 48.2104C42.0401 48.9982 42.2723 49.8192 42.7615 50.35C44.3952 52.1246 47.4718 49.3963 45.6474 48.0114M14.3752 29.5685C14.0435 30.9865 15.3123 32.4792 16.6391 32.1143C18.4552 31.6251 18.4967 29.1787 17.7172 27.7026C16.2494 24.9163 12.2191 24.4353 10.0713 26.7075C6.89521 30.0743 8.86058 35.1992 11.6303 38.1348C15.1381 41.8417 20.4289 42.729 24.343 45.847C25.0728 46.4275 25.6864 47.2651 25.8357 48.2104C25.9601 48.9982 25.7279 49.8192 25.2386 50.35C23.605 52.1246 20.5284 49.3963 22.3528 48.0114M22.8088 7.34419C25.7941 8.28127 26.1673 11.391 26.1673 11.391C26.1673 11.391 26.4161 8.53005 29.5259 7.34419C26.4161 6.15834 26.1673 3.29736 26.1673 3.29736C26.1673 3.29736 25.7859 6.40712 22.8088 7.34419ZM40.4226 7.21154C42.5207 7.87496 42.786 10.0559 42.786 10.0559C42.786 10.0559 42.9602 8.04081 45.1495 7.21154C42.9602 6.38227 42.786 4.36715 42.786 4.36715C42.786 4.36715 42.5207 6.55642 40.4226 7.21154ZM15.104 55.135C17.2021 55.7984 17.4675 57.9794 17.4675 57.9794C17.4675 57.9794 17.6416 55.9643 19.8309 55.135C17.6416 54.3057 17.4675 52.2906 17.4675 52.2906C17.4675 52.2906 17.2021 54.4799 15.104 55.135ZM45.6563 18.7229C47.968 19.4007 49.6488 20.6092 49.4104 21.4223C49.1721 22.2353 47.1048 22.345 44.793 21.6673C42.4813 20.9895 40.8005 19.781 41.0389 18.9679C41.2773 18.1549 43.3445 18.0452 45.6563 18.7229ZM27.9563 19.2449C28.1947 20.058 26.5139 21.2665 24.2022 21.9443C21.8905 22.622 19.8232 22.5124 19.5848 21.6993C19.3464 20.8862 21.0272 19.6777 23.339 18.9999C25.6507 18.3222 27.718 18.4319 27.9563 19.2449Z"
        stroke="currentColor"
        strokeWidth="1.03659"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaceholderSlideContent({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: t.text.muted }}>
      <IconWrapper size={32} color={t.text.muted}>
        <TrendingUp size={32} strokeWidth={1.5} />
      </IconWrapper>
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, textAlign: "center" }}>
        {label} case study coming soon
      </p>
    </div>
  );
}

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: "newgen-redesign",
    cardType: "redesign",
    categoryLabel: "Events",
    proofCaption: "Looks dated. Feels untrustworthy. Blends in.",
    footer: {
      brandName: "Newgen Event Studio",
      category: "Corporate Events category",
      socialProofUrl: "https://www.instagram.com/p/DbC4-mUS_DB/",
    },
    before: (
      <>
        <img
          src="/img/branding/hero/newgen-before-crest.png"
          alt="New Gen Event's original ornate crest logo"
          style={{ width: 130, height: 130, objectFit: "contain" }}
        />
        <p
          style={{
            margin: 0,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            fontSize: 11,
            lineHeight: "14px",
            letterSpacing: "0.06px",
            color: tokens.dangerText,
          }}
        >
          Too ornamental &bull; Hard to scale
        </p>
      </>
    ),
    after: (
      <>
        <img
          src="/img/branding/hero/newgen-after-wordmark.svg"
          alt="Redesigned NEWGEN EVENT STUDIO wordmark with N monogram"
          style={{ width: 150, height: "auto" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <ChecklistItem text="Clean. Confident. Memorable." />
          <ChecklistItem text="Built for scale across every touchpoint." />
          <ChecklistItem text="Instantly communicates trust." />
        </div>
        <VerticalTab label="STRATEGY  ·  DESIGN  ·  IMPACT" />
      </>
    ),
  },
  {
    // TODO: replace with real retail case study asset
    id: "retail-placeholder",
    cardType: "new-build",
    categoryLabel: "Retail",
    after: <PlaceholderSlideContent label="Retail" />,
  },
  {
    // TODO: replace with real clinic/services case study asset
    id: "clinic-placeholder",
    cardType: "new-build",
    categoryLabel: "Clinic",
    after: <PlaceholderSlideContent label="Clinic/services" />,
  },
];

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY = "'Inter', system-ui, -apple-system, sans-serif";
const MONO = "'SF Mono', monospace";

const eyebrow: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: tokens.gold,
};

const sectionLabel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: t.text.muted,
};

const PHASES = [
  {
    id: "foundation",
    color: tokens.primary,
    label: "PHASE 1",
    title: "Foundation",
    timeline: "Month 1 - 2",
    description: "Before anything goes public, build an identity that carries the brand for the next 10 years.",
  },
  {
    id: "visibility",
    color: tokens.gold,
    label: "PHASE 2",
    title: "Visibility",
    timeline: "Month 2 - 4",
    description: "The brand exists. Now it needs to be seen on every screen where your clients are looking.",
  },
  {
    id: "scale",
    color: t.border.danger,
    label: "PHASE 3",
    title: "Scale",
    timeline: "Month 4 - 6",
    description: "Build the engine underneath so the business grows whether you are at the event or not.",
  },
] as const;

const WORKFLOW_STEPS = [
  { number: "01", label: "Capture", description: "Every event photographed and logged." },
  { number: "02", label: "Triage", description: "15 minutes to sort the keepers each evening." },
  { number: "03", label: "Produce", description: "Reels, posts, and stories cut to the brand template." },
  { number: "04", label: "Publish", description: "Scheduled across Instagram and WhatsApp Status." },
  { number: "05", label: "Amplify", description: "Best performers repurposed into paid and BNI content." },
];

const WEBSITE_PAGES = [
  { name: "Home", description: "The pitch in 10 seconds." },
  { name: "About", description: "Founder story and credibility." },
  { name: "Services", description: "Every offering, clearly scoped." },
  { name: "Portfolio", description: "Weddings, corporate, destination." },
  { name: "Testimonials", description: "Social proof that converts." },
  { name: "Contact", description: "One form, one WhatsApp link." },
];

export function BrandingLandingPage() {
  const { isMobile } = useBreakpoint();
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = CAROUSEL_SLIDES[activeSlide];

  useEffect(() => {
    document.title = "Brand Identity Design · Eswar Creatives";
    document.documentElement.style.background = t.background.page;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Brand Identity Design &middot; Eswar Creatives</title>
        <meta property="og:title" content="Brand Identity Design &middot; Eswar Creatives" />
        <meta property="og:description" content="Visual identity systems for growing businesses. Logo, colour, typography, and collateral that works everywhere your brand shows up. Three packages from Rs 25,000." />
        <meta property="og:image" content="https://www.eswarcreatives.in/og-branding.png" />
        <meta property="og:url" content="https://www.eswarcreatives.in/branding/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Eswar Creatives" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Brand Identity Design &middot; Eswar Creatives" />
        <meta name="twitter:description" content="Visual identity systems for growing businesses. Logo, colour, typography, and collateral that works everywhere your brand shows up. Three packages from Rs 25,000." />
        <meta name="twitter:image" content="https://www.eswarcreatives.in/og-branding.png" />
      </Helmet>

      <div style={{ minHeight: "100vh", background: t.background.page, fontFamily: BODY, color: t.text.primary }}>
        <LandingNav />

        {/* SECTION 1 — HERO */}
        <section style={{ paddingTop: 80 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "32px 20px 0" : "72px 24px 0" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 560px",
                gap: isMobile ? 40 : 42,
                alignItems: "center",
              }}
            >
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}>
                <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
                  <p style={{ ...eyebrow, color: tokens.goldDark, margin: 0 }}>Branding for growing Indian businesses</p>
                  <div style={{ position: "absolute", left: 0, bottom: -7, height: 2, width: 78, background: tokens.gold, borderRadius: 9999 }} />
                </div>
                <h1
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: isMobile ? 30 : 44,
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    color: t.text.primary,
                    marginBottom: 20,
                  }}
                >
                  You built a real business. Your brand should{" "}
                  <span style={{ position: "relative", display: "inline-block", color: tokens.accent, fontStyle: "italic" }}>
                    look like it.
                    <img
                      src="/img/branding/hero/headline-underline.svg"
                      alt=""
                      aria-hidden
                      style={{ position: "absolute", left: 0, bottom: -6, width: "100%", height: "auto", pointerEvents: "none" }}
                    />
                  </span>
                </h1>
                <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.6, color: t.text.primary, maxWidth: 500, marginBottom: 20 }}>
                  Somewhere between your first customer and your fortieth lakh a month, the business changed. The{" "}
                  <strong style={{ fontWeight: 700 }}>logo</strong>, the <strong style={{ fontWeight: 700 }}>website</strong>, and the{" "}
                  <strong style={{ fontWeight: 700 }}>pitch</strong> never did. <strong style={{ fontWeight: 700 }}>We close that gap,</strong> so
                  your brand finally looks like what you actually built.
                </p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${tokens.gold}`, padding: "2px 0 2px 12px", marginBottom: 32, maxWidth: 520 }}>
                  <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 15, color: t.text.primary, margin: 0, lineHeight: 1.55 }}>
                    Every customer who <strong style={{ fontWeight: 700 }}>checks you out online</strong> before they call is quietly deciding
                    if you're the real thing.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <CTAButton variant="primary" label="See our work →" href="/branding/work" />
                  <CTAButton variant="outline" label="Let's talk" href={LETS_TALK_MAILTO} />
                </div>
                <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted, marginTop: 12 }}>
                  Prefer async?{" "}
                  <a href={BRAND_BRIEF_MAILTO} style={{ color: t.text.urlLink, textDecoration: "underline" }}>
                    Fill a brand brief
                  </a>{" "}
                  instead.
                </p>
              </motion.div>

              <div>
                <BeforeAfterCard
                  beforeContent={slide.before}
                  afterContent={slide.after}
                  categoryLabel={slide.categoryLabel}
                  proofCaption={slide.proofCaption}
                  cardType={slide.cardType}
                />
                <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
                  <span
                    aria-hidden
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      background: t.text.primary,
                      color: t.text.inverse,
                      borderRadius: 9999,
                      padding: "4px 8px",
                      fontFamily: BODY,
                      fontWeight: 600,
                      fontSize: 12,
                      lineHeight: "14px",
                      marginRight: 2,
                    }}
                  >
                    {activeSlide + 1}/{CAROUSEL_SLIDES.length}
                  </span>
                  {CAROUSEL_SLIDES.map((s, index) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={`Show ${s.categoryLabel} case`}
                      aria-current={index === activeSlide}
                      onClick={() => setActiveSlide(index)}
                      style={{
                        width: index === activeSlide ? 20 : 7,
                        height: 7,
                        borderRadius: 9999,
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        background: index === activeSlide ? t.text.primary : t.border.medium,
                        transition: `width ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
                      }}
                    />
                  ))}
                </div>
                {slide.footer ? (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <p style={{ margin: 0, fontFamily: BODY, fontStyle: "italic", fontSize: 15, letterSpacing: "-0.23px", color: t.text.tertiary }}>
                      Real client logo for <strong style={{ fontWeight: 700 }}>{slide.footer.brandName}</strong> {slide.footer.category}
                    </p>
                    {slide.footer.socialProofUrl && (
                      <a
                        href={slide.footer.socialProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 6,
                          fontFamily: BODY,
                          fontStyle: "italic",
                          fontSize: 15,
                          letterSpacing: "-0.23px",
                          color: t.text.tertiary,
                          textDecoration: "underline",
                        }}
                      >
                        social proof <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 13, color: t.text.tertiary, textAlign: "center", marginTop: 16 }}>
                    Real client work across categories, not just one vertical
                  </p>
                )}
              </div>
            </div>

            <div style={{ padding: isMobile ? "32px 0 40px" : "26px 0 48px" }}>
              <div
                style={{
                  background: t.background.surface,
                  border: `1px solid ${t.border.subtle}`,
                  borderRadius: 20,
                  // Neutral drop shadow — same rgb base as the t.border.* overlay
                  // scale (rgba(10,10,23,X)), no dedicated shadow token exists yet.
                  boxShadow: "0 4px 16px rgba(10,10,23,0.06)",
                  padding: isMobile ? "32px 20px" : "44px 40px",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                }}
              >
                <FitPill
                  icon={
                    <IconWrapper size={56} color={tokens.gold}>
                      <GrowthIcon />
                    </IconWrapper>
                  }
                  title="Already scaling"
                  description="Built for owners doing ₹30L to ₹1Cr a month"
                />
                {!isMobile && <div style={{ width: 1, height: 109, background: t.border.default }} />}
                <FitPill
                  icon={
                    <IconWrapper size={56} color={tokens.gold}>
                      <TeamIcon />
                    </IconWrapper>
                  }
                  title="Owner-run, any category"
                  description="Retail, clinics, events, real estate, services"
                />
                {!isMobile && <div style={{ width: 1, height: 109, background: t.border.default }} />}
                <FitPill
                  icon={
                    <IconWrapper size={56} color={tokens.gold}>
                      <TrophyIcon />
                    </IconWrapper>
                  }
                  title="The credibility gap"
                  description="Real revenue, not yet a real brand"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — THREE PHASE INTRO */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
              <p style={{ ...eyebrow, marginBottom: 12 }}>How it works</p>
              <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: isMobile ? 26 : 32, color: t.text.primary, marginBottom: 12 }}>
                3 phases. 8 solutions. 6 months.
              </h2>
              <p style={{ fontFamily: BODY, fontSize: 15, color: t.text.secondary, marginBottom: 40, maxWidth: 560, lineHeight: 1.7 }}>
                Every business is different. Every engagement starts with Foundation and grows at your pace.
              </p>
            </motion.div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20 }}>
              {PHASES.map((phase) => (
                <div
                  key={phase.id}
                  style={{
                    background: t.background.surface,
                    border: `1px solid ${t.border.subtle}`,
                    borderTop: `4px solid ${phase.color}`,
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p style={{ fontFamily: MONO, fontSize: 10, color: phase.color, letterSpacing: ".1em", marginBottom: 8 }}>{phase.label}</p>
                  <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: t.text.primary, marginBottom: 6 }}>{phase.title}</h3>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 14 }}>{phase.timeline}</p>
                  <p style={{ fontFamily: BODY, fontSize: 14, color: t.text.secondary, lineHeight: 1.6 }}>{phase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — PHASE 1 FOUNDATION */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={tokens.primary} eyebrow="PHASE 1 &middot; FOUNDATION" title="Before anything goes public" isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="01" title="Brand Identity Design">
                <ScopeList
                  items={[
                    "Abstract monogram + wordmark logo system",
                    "Full colour system: Gold, Teal, Cream, Ochre, Ruby",
                    "Premium typography pair",
                    "Application proofs: business card, quotation, WhatsApp, signboard",
                    "Photo watermark",
                    "All master files: AI, EPS, SVG, PNG, PDF",
                  ]}
                />
                <CardFooter timeline="2 - 3 weeks" />
              </ServiceCard>

              <ServiceCard number="02" title="Brand Guidelines Document">
                <ScopeList
                  items={[
                    "Brand story, mission, vision, personality",
                    "Logo usage rules + visual violations guide",
                    "Colour codes: HEX, RGB, CMYK, Pantone",
                    "Typography hierarchy + approved fonts",
                    "Photography style guide + mandatory shots",
                    "Tone of voice + Tamil/English caption framework",
                    "1-page quick reference for field team",
                  ]}
                />
                <CardFooter timeline="1 week" />
              </ServiceCard>

              <ServiceCard number="03" title="Business Profile PDF">
                <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 13, color: t.text.muted, marginBottom: 12 }}>
                  10 pages. Replaces the 1-hour verbal pitch.
                </p>
                <ScopeList
                  items={[
                    "Cover + founder story",
                    "Services overview (icon grid, no paragraphs)",
                    "3 differentiators: guest-first, sketch-led, end-to-end",
                    "Credibility stats",
                    "Portfolio: weddings, corporate, destination",
                    "Client testimonials + Google review QR",
                  ]}
                />
                <CardFooter timeline="3 weeks" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* SECTION 4 — PHASE 2 VISIBILITY */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={tokens.gold} eyebrow="PHASE 2 &middot; VISIBILITY" title="The brand exists. Now it needs to be seen." isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="04" title="Social Media Branding + Workflow">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 20 }}>
                  Turn 1,500 events of invisible proof into a content machine that works while you sleep.
                </p>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 8, marginBottom: 16 }}>
                  {WORKFLOW_STEPS.map((step) => (
                    <div key={step.number} style={{ flex: 1 }}>
                      <p style={{ fontFamily: MONO, fontSize: 12, color: tokens.primary, marginBottom: 4 }}>{step.number}</p>
                      <p style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, color: t.text.primary, marginBottom: 2 }}>{step.label}</p>
                      <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted, lineHeight: 1.5 }}>{step.description}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: tokens.primary, color: t.text.onPrimary, borderRadius: 8, padding: "16px 20px", marginTop: 16 }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: tokens.gold, marginBottom: 6 }}>Your only new habit:</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, margin: 0, lineHeight: 1.6 }}>
                    15 minutes of photo review each evening. Everything else (design, scheduling, captions, Google profile) is handled by us.
                  </p>
                </div>
                <CardFooter timeline="Ongoing from Month 1" />
              </ServiceCard>

              <ServiceCard number="05" title="Website Design">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 20 }}>
                  A lead-generation site, not a brochure. Built so Google sends you clients while you are at a venue partner.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                  {WEBSITE_PAGES.map((page) => (
                    <div key={page.name}>
                      <p style={{ fontFamily: BODY, fontSize: 13, fontWeight: 500, color: t.text.primary, marginBottom: 2 }}>{page.name}</p>
                      <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted }}>{page.description}</p>
                    </div>
                  ))}
                </div>
                <div style={{ border: `1px solid ${t.border.subtle}`, borderRadius: 6, padding: "12px 16px", marginTop: 4, marginBottom: 16 }}>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, margin: 0, lineHeight: 1.6 }}>
                    SEO built-in, not bolted on. Each service page targets one search term. No paid ads needed to start.
                  </p>
                </div>
                <CardFooter timeline="4 - 6 weeks" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* SECTION 5 — PHASE 3 SCALE */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={t.border.danger} eyebrow="PHASE 3 &middot; SCALE" title="Build the engine so it runs without you." isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="06" title="SOP + Workflow Definition">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 16 }}>
                  Document the system that currently exists only in your head so Bengaluru and Tiruchi can run the same playbook.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
                  {["Field execution", "Customer relationship", "Business operations"].map((label) => (
                    <p key={label} style={{ ...sectionLabel, margin: 0 }}>{label.toUpperCase()}</p>
                  ))}
                </div>
                <CardFooter timeline="2 - 3 weeks" />
              </ServiceCard>

              <ServiceCard number="07" title="CRM + Lead Automation">
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, color: tokens.primary, margin: 0 }}>300</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, margin: 0 }}>leads per season never followed up</p>
                </div>
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, marginBottom: 12 }}>
                  Enquiry <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Quote{" "}
                  <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Confirmed{" "}
                  <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Delivered
                </p>
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 4 }}>
                  Auto follow-up: Day 1, 3, 7 post-enquiry
                </p>
                <CardFooter timeline="4 weeks" />
              </ServiceCard>

              <ServiceCard number="08" title="Personal Brand: Founder as Brand">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 16 }}>
                  Your hand-sketch approach and your founder story is your biggest untapped asset.
                </p>
                <ScopeList
                  items={[
                    "Founder story content series (Reels + posts)",
                    "Sketch to setup, behind the scenes format",
                    "BNI profile + one-to-one pitch deck",
                  ]}
                />
                <CardFooter timeline="Ongoing" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* ON INVESTMENT */}
        <section style={{ padding: isMobile ? "0 20px" : "0 24px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <div
              style={{
                background: t.background.subtle,
                border: `1px solid ${t.border.subtle}`,
                borderRadius: 12,
                padding: isMobile ? "28px 20px" : "36px 40px",
                margin: "0 0 64px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 20 : 48,
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: tokens.gold, marginBottom: 10 }}>
                  On investment
                </p>
                <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 20 : 24, fontWeight: 600, color: t.text.primary, marginBottom: 10 }}>
                  Price is proposed after we understand your business.
                </h2>
                <p style={{ fontFamily: BODY, fontSize: 14, color: t.text.secondary, lineHeight: 1.8, margin: 0 }}>
                  Every engagement is scoped to your specific situation, not a fixed package. We start with a short discovery conversation. If there is a fit, we propose an investment with a clear return on it.
                </p>
              </div>

              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "14px 28px",
                    background: tokens.primary,
                    color: t.text.onPrimary,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Book a discovery call &rarr;
                </a>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.text.muted, marginTop: 8 }}>
                  30 minutes. No commitment.
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: t.text.muted, marginTop: 12 }}>
                  or{" "}
                  <a href="/branding/brand-identity-discovery" style={{ color: tokens.primary, textDecoration: "underline", fontWeight: 500 }}>
                    start with a brand brief
                  </a>
                  , we follow up within 3 days
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — ONGOING RETAINER */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <div style={{ background: t.background.subtle, padding: isMobile ? "32px 24px" : "48px 40px", borderRadius: 12 }}>
              <p style={{ ...eyebrow, marginBottom: 12 }}>Ongoing partnership</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: t.text.primary, marginBottom: 10 }}>Performance Growth Retainer</h2>
              <p style={{ fontFamily: BODY, fontSize: 15, color: t.text.secondary, marginBottom: 32, maxWidth: 560, lineHeight: 1.7 }}>
                Organic client acquisition through search. You pay more only when revenue comes from the website.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 24 }}>
                <div>
                  <p style={{ ...sectionLabel, marginBottom: 12 }}>What is covered</p>
                  <ScopeList
                    items={[
                      "SEO",
                      "Google Business optimisation",
                      "Local search rankings",
                      "Performance reporting",
                      "Conversion tracking",
                    ]}
                  />
                </div>
                <div style={{ background: tokens.primary, padding: 24, borderRadius: 8, color: t.text.onPrimary }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: tokens.gold, marginBottom: 12 }}>THE INCENTIVE MODEL</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, marginBottom: 8, lineHeight: 1.6 }}>
                    Minimal fixed monthly retainer (keeps overhead low)
                  </p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, marginBottom: 20, lineHeight: 1.6 }}>
                    Performance incentive per confirmed booking
                  </p>
                  <CTAButton variant="primary" label="Chat on WhatsApp →" href={RETAINER_WHATSAPP_URL} target="_blank" />
                  <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.onPrimary, opacity: 0.75, marginTop: 10, marginBottom: 0 }}>
                    Opens WhatsApp. We reply personally, usually same day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — CTA */}
        <section style={{ padding: isMobile ? "48px 20px" : "64px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 600, color: t.text.primary, marginBottom: 32, lineHeight: 1.3 }}>
              The most authentic event business in Chennai deserves the most authentic brand.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PortfolioButton
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: tokens.primary,
                  color: t.text.onPrimary,
                  borderColor: tokens.primary,
                  padding: "12px 24px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Book a discovery call
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
            </div>
            <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginTop: 12 }}>
              or{" "}
              <a href="/branding/brand-identity-discovery" style={{ color: tokens.primary, textDecoration: "underline" }}>
                start with a written brief
              </a>{" "}
              at your own pace
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function PhaseHeader({ color, eyebrow: label, title, isMobile }: { color: string; eyebrow: string; title: string; isMobile: boolean }) {
  return (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 16, marginBottom: 32 }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: tokens.primary, marginBottom: 6 }}>{label}</p>
      <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: t.text.primary, margin: 0 }}>{title}</h2>
    </div>
  );
}

function ServiceCard({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: t.background.surface,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: 12,
        padding: 24,
        transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: 11, color: t.text.muted, marginBottom: 8 }}>{number}</p>
      <h3 style={{ fontFamily: BODY, fontSize: 16, fontWeight: 600, color: t.text.primary, marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function ScopeList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 4 }}>
      {items.map((item) => (
        <li key={item} style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, padding: "4px 0", lineHeight: 1.5 }}>
          <span style={{ color: tokens.primary, marginRight: 6 }}>&middot;</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function CardFooter({ timeline }: { timeline: string }) {
  if (!timeline) return null;
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.border.subtle}` }}>
      <p style={{ fontFamily: MONO, fontSize: 12, color: t.text.muted, margin: 0 }}>{timeline}</p>
    </div>
  );
}
