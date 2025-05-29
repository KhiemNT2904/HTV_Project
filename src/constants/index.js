import * as Icon from '../component/icons';
import React from 'react';

export default {
  MOBILE_SIZE: 640,
};

export const MENU = [
  {
    title: 'Trang chủ', // Ana sayfa
    path: '/',
    icon: <Icon.Home />,
    iconSelected: <Icon.HomeActive />
  },
  {
    title: 'Tìm kiếm', // Ara
    path: '/search',
    icon: <Icon.Search />,
    iconSelected: <Icon.SearchActive />
  },
  {
    title: 'Thư viện', // Kitaplığın
    path: '/library',
    icon: <Icon.Library />,
    iconSelected: <Icon.LibraryActive />
  }
];

export const PLAYLISTBTN = [
  {
    title: 'Tạo danh sách phát', // Çalma Listesi Oluştur
    path: '/',
    ImgName: 'createPlaylist',
  },
  {
    title: 'Bài hát đã thích', // Beğenilen Şarkılar
    path: '/',
    ImgName: 'popularSong',
  }
];

export const LIBRARYTABS = [
  {
    title: 'Danh sách phát', // Çalma Listeleri
    path: '/library'
  },
  {
    title: 'Podcast', // Podcast'ler
    path: '/library/podcasts'
  },
  {
    title: 'Nghệ sĩ', // Sanatçılar
    path: '/library/artists'
  },
  {
    title: 'Album', // Albümler
    path: '/library/albums'
  }
];
