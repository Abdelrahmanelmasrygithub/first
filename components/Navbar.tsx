// components/Navbar.tsx - النافبار بعد نقل كل اللوجيك إلى SideDrawer (أصبح أبسط بكثير)

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import SideDrawer from './SideDrawer'; // ← استيراد SideDrawer اللي بيحتوي على كل الداتا واللوجيك

export default function Navbar() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  return (
    <View style={styles.navbar}>
      <Text style={styles.title}>Panda Hii</Text>

      {/* زر فتح الـ Drawer */}
      <TouchableOpacity onPress={() => setDrawerVisible(true)}>
        <Ionicons name="person-circle-outline" size={34} color="#000" />
      </TouchableOpacity>

      {/* استخدام SideDrawer بدون تمرير داتا (الكل داخلها) */}
      <SideDrawer 
        visible={drawerVisible} 
        onClose={() => setDrawerVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 1000,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
});